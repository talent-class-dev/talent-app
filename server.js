require('dotenv').config();
const express = require('express');
const syncData = require('./sync');
const getDailyAdInsights = require('./getDailyAdSpent');
const logger = require('./logger');
const cron = require('cron'); 
const accountId = process.env.FACEBOOK_ACCOUNT_ID;

const app = express();
const PORT = process.env.PORT || 3000;

const activeJobs = true;

// Programa la tarea para que se ejecute una vez al día a medianoche
const dayJob = new cron.CronJob('0 0 * * *', async () => {
    logger.info('Running daily ad spend sync task');
    try {        
        await getDailyAdInsights(accountId, 'yesterday');
        logger.info('Daily ad spend sync completed successfully');
    } catch (error) {
        if (error.response.data.error.code == 17 ) {            
            const delay = 5 * 30 * 1000
            logger.error(`Delayed 5 min: ${error.response.data.error.error_user_msg}`);
            setTimeout(
                await getDailyAdInsights(accountId)
            ,delay);
          } else {
            logger.error(`Error Daily ad spend sync: ${error.message}`);   
            throw error;
          }
    }
});
activeJobs? dayJob.start():'';

// Programa la tarea para que se ejecute cada hora que acaba en 0
const hourJob = new cron.CronJob('0 * * * *', async () => {
    logger.info('Running hourly :00 data sync task');
    try {        
        await syncData(accountId);
        logger.info('Hourly at :00 data sync completed successfully');
    } catch (error) {
        logger.error(`Error during hourly at :00 data sync: ${error.message}`);
    }
});
activeJobs? hourJob.start():'';

// Programa la tarea para que se ejecute cada hora que acaba en 30
const hour30Job = new cron.CronJob('30 * * * *', async () => {
    logger.info('Running hourly :30 data sync task');
    try {        
        await getDailyAdInsights(accountId, 'today');
        logger.info('Hourly at :30 data sync completed successfully');
    } catch (error) {
        if (error.response.data.error.code == 17 ) {            
            const delay = 5 * 30 * 1000
            logger.error(`Delayed 5 min: ${error.response.data.error.error_user_msg}`);
            setTimeout(
                await getDailyAdInsights(accountId)
            ,delay);
          } else {
            logger.error(`Error Hourly at :30 data sync: ${error.message}`);   
            throw error;
          }
    }
});
activeJobs? hour30Job.start():'';

app.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);

    // Realiza una sincronización inicial al iniciar el servidor
    try {        
        //await syncData(accountId); 
        //await getDailyAdInsights(accountId);
        logger.info('Initial data sync completed successfully');
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // Si el token ha expirado, generar un nuevo token
            /*accessToken = await generateAccessToken(
              appId,
              appSecret,
              systemUserId,
              businessAppId,
              scopes
            );
            // Reintentar la solicitud con el nuevo token
            return getFacebookData(
              accountId,
              dataType,
              fields,
              appId,
              appSecret,
              systemUserId,
              businessAppId,
              scopes
            );*/
          } else if (error.response.data.error.code == 17 ) {            
            const delay = 5 * 30 * 1000
            logger.error(`Delayed 5 min: ${error.response.data.error.error_user_msg}`);
            setTimeout(
                await getDailyAdInsights(accountId)
            ,delay);
          } else {
            logger.error(`Error during initial data sync: ${error.message}`);   
            throw error;
          }
        
    }
});

module.exports = app;
