const axios = require('axios');
const logger = require('./logger');
const crypto = require('crypto');
const bizSdk = require('facebook-nodejs-business-sdk');
const FacebookAdsApi = bizSdk.FacebookAdsApi;
const AdAccount = bizSdk.AdAccount;

const generateAppSecretProof = (accessToken, appSecret) => {
  return crypto
    .createHmac("sha256", appSecret)
    .update(accessToken)
    .digest("hex");
};

const generateAccessToken = async (appId, appSecret, systemUserId, businessAppId, scopes) => {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const appSecretProof = generateAppSecretProof(accessToken, appSecret);
  const url = `https://graph.facebook.com/v20.0/${systemUserId}/access_tokens`;

  try {
    const response = await axios.post(url, null, {
      params: {
        business_app: businessAppId,
        scope: scopes.join(","),
        appsecret_proof: appSecretProof,
        access_token: accessToken,
        set_token_expires_in_60_days: true,
      },
    });

    const newAccessToken = response.data.access_token;
    process.env.FACEBOOK_ACCESS_TOKEN = newAccessToken; // Almacenar el nuevo token en una variable de entorno
    return newAccessToken;
  } catch (error) {
    logger.error(`Error generating access token: ${error.message}`);
    throw error;
  }
};

const updateAccessToken = async (appId, appSecret, currentAccessToken) => {
  const url = `https://graph.facebook.com/v20.0/oauth/access_token`;

  try {
    const response = await axios.get(url, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: currentAccessToken,
        set_token_expires_in_60_days: true,
      },
    });

    const updatedAccessToken = response.data.access_token;
    process.env.FACEBOOK_ACCESS_TOKEN = updatedAccessToken; // Almacenar el nuevo token en una variable de entorno
    return updatedAccessToken;
  } catch (error) {
    logger.error(`Error updating access token: ${error.message}`);
    throw error;
  }
};


const getFacebookData = async (accountId, dataType, fields, rangeDate, appId, appSecret, systemUserId, businessAppId, scopes) => {
    let accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    //const appSecretProof = generateAppSecretProof(accessToken, appSecret);
    
    FacebookAdsApi.init(accessToken);
  
    const url = `https://graph.facebook.com/v20.0/act_${accountId}/${dataType}`;
    const params = {
      access_token: accessToken,
      //appsecret_proof: appSecretProof,
      limit: 1000,
      fields: fields,
      since: rangeDate? rangeDate:''
    };
  
    let allData = [];
  
    try {
      let nextPage = url;
      while (nextPage) {
        const response = await axios.get(nextPage, { params });
        const responseData = response.data 

        // Obtener el call_count de los encabezados y controlar el límite
        const callCount = response.headers['x-app-usage'] ? JSON.parse(response.headers['x-app-usage']).call_count:0;
        if (callCount >= 190) {
            logger.info(`Call count approaching limit (${callCount}/200), delaying further requests.`);
            await new Promise(resolve => setTimeout(resolve, 3600000)); // Esperar 1 hora (3600000 ms)
        }
        console.log('call_count:', callCount)

        const resetTimeDuration = response.headers['x-ad-account-usage'] ? JSON.parse(response.headers['x-ad-account-usage']).reset_time_duration:0
        console.log('reset_time_duration:', resetTimeDuration)
  
        allData = allData.concat(responseData.data);
        nextPage = responseData.paging ? responseData.paging.next : null;
  
        // Verificar si el token está a punto de expirar y actualizar si es necesario
        const tokenDateExpire = new Date(response.headers["expires"]);
        const today = new Date();
        const expiresIn = tokenDateExpire.getTime() - today.getTime();
        console.log('expires:', expiresIn)
        /*if (expiresIn && expiresIn < 3600) {
          // Si quedan menos de 1 hora (3600 segundos)
          accessToken = await updateAccessToken(appId, appSecret, accessToken);
          nextPage = nextPage.replace(
            /access_token=[^&]+/,
            `access_token=${accessToken}`
          );
        }*/
        
      }
  
      return allData;
    } catch (error) {
        logger.error(`Error fetching data from Facebook: ${error.message}`);        
        throw error;
    }
};
  

module.exports = getFacebookData;
