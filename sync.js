const axios = require('axios');
const { updateAirtable, getAirtableRecords } = require('./airtable');
const logger = require('./logger');
const getFacebookData = require('./facebook');

// Función para mapear los IDs de campaña y adset de Facebook a los IDs de Airtable
const mapFacebookIdsToAirtableIds = (facebookData, airtableRecords) => {
    const campaignMap = new Map(airtableRecords.map(record => [record.fields.campaign_id, record.id]));
    const adsetMap = new Map(airtableRecords.map(record => [record.fields.adset_id, record.id]));

    facebookData.forEach(item => {
        if (item.campaign_id && campaignMap.has(item.campaign_id)) {
            item.campaign_id = campaignMap.get(item.campaign_id);
        }
        if (item.adset_id && adsetMap.has(item.adset_id)) {
            item.adset_id = adsetMap.get(item.adset_id);
        }
    });
};

// Función para sincronizar datos desde Facebook a Airtable
const syncData = async (accountId) => {
    try {
        //const campaigns = await getAirtableRecords('FB Campaigns');
        const adsets = await getAirtableRecords('FB Adsets');

        let campaignsData = await getFacebookData(accountId, 'campaigns', 'id,name,daily_budget,budget_remaining,start_time,status');
        let adsetsData = await getFacebookData(accountId, 'adsets', 'id,status,name,budget_remaining,bid_amount,bid_info,bid_strategy,campaign_id');
        let adsData = await getFacebookData(accountId, 'ads', 'id,name,adset_id,campaign_id,status,bid_amount,bid_info,bid_type');

        mapFacebookIdsToAirtableIds(adsetsData, adsets);
        mapFacebookIdsToAirtableIds(adsData, adsets);

        await updateAirtable('FB Campaigns', campaignsData);
        await updateAirtable('FB Adsets', adsetsData);
        await updateAirtable('FB Ads', adsData);

        logger.info('Data synchronized successfully');
    } catch (error) {
        logger.error(`Error during data synchronization: ${error.message}`);
        throw error;
    }
};

module.exports = syncData;
