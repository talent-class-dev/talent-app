const axios = require('axios');
const { updateAirtable } = require('./airtable');
const getFacebookData = require('./facebook');
const logger = require('./logger');

// Función para dividir un array en bloques
const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

// Función para obtener insights diarios por anuncio y combinarlos con los datos de los anuncios
const getDailyAdInsights = async (accountId, rangeDate) => {
  try {
    // Obtener la lista de anuncios
    const ads = await getFacebookData(accountId, 'ads', 'id,name', rangeDate, process.env.FACEBOOK_APP_ID, process.env.FACEBOOK_APP_SECRET, process.env.FACEBOOK_SYSTEM_USER_ID, process.env.FACEBOOK_BUSINESS_APP_ID, ['ads_management', 'read_insights', 'ads_read']);
    const adChunks = chunkArray(ads, 50); // Dividir anuncios en bloques de 50

    const combinedData = [];

    // Obtener insights para cada bloque de anuncios
    for (const adChunk of adChunks) { 
      const batchRequests = adChunk.map(ad => ({
        method: 'GET',
        relative_url: `${ad.id}/insights?fields=ad_id,date_start,date_stop,spend,impressions&level=ad&time_increment=1`
      }));

      const response = await axios.post(`https://graph.facebook.com/v20.0/`, {
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
        batch: batchRequests
      });

      const responseData = response.data;

      // Procesar respuestas del batch
      responseData.forEach((batchResponse, index) => {
        const insights = JSON.parse(batchResponse.body).data;
        insights.forEach(insight => {
          combinedData.push({
            "id": adChunk[index].id,
            "name": adChunk[index].name,
            "spend": insight.spend,
            "date_start": insight.date_start,
            "date_stop": insight.date_stop,
            "impressions": insight.impressions
          });
        });
      });
    }

    // Actualizar Airtable con los datos combinados
    await updateAirtable('FB Insights', combinedData, true);

    logger.info('Daily ad insights data synchronized with Airtable successfully');
  } catch (error) {
    logger.error(`Error fetching daily ad insights from Facebook: ${error.message}`);
    throw error;
  }
};

module.exports = getDailyAdInsights;
