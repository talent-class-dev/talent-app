const Bull = require('bull');
const syncData = require('./sync');
const logger = require('./logger');

// Configuración de Bull para manejar la cola de trabajos
const redisOptions = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null // Deshabilita el límite de reintentos por solicitud
    }
};

const syncQueue = new Bull('syncQueue', process.env.REDIS_URL || redisOptions);

// Procesar trabajos de sincronización
syncQueue.process(async (job, done) => {
    const { accountId } = job.data;
    try {
        await syncData(accountId);
        done();
    } catch (error) {
        logger.error(`Error processing sync job: ${error.message}`);
        done(error);
    }
});

// Logging de eventos de Bull
syncQueue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
});

syncQueue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} failed: ${error.message}`);
});

// Añadir un nuevo trabajo de sincronización a la cola
const addSyncJob = (accountId) => {
    syncQueue.add({ accountId }, { attempts: 3, backoff: 5000 }); // Intentar 3 veces con un backoff de 5 segundos
};

module.exports = addSyncJob;
