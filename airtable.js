const Airtable = require('airtable');
const logger = require('./logger');

// Inicializar la instancia de Airtable con tus credenciales
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Función para obtener los registros de la tabla de Airtable
const getAirtableRecords = async (tableName) => {
    try {
        const records = await base(tableName).select().all();
        return records;
    } catch (error) {
        logger.error(`Error fetching records from Airtable: ${error.message}`);
        throw error;
    }
};

// Función para actualizar datos en Airtable
const updateAirtable = async (tableName, newData, filterByFormula) => {
    try {
        await Promise.all(newData.map(async (record) => {
            
            let filterByFormulaFinal
            if (filterByFormula) {
                filterByFormulaFinal = `AND({id} = '${record.id}', DATESTR(CREATED_TIME()) = DATESTR(TODAY()))`
            } else {
                filterByFormulaFinal = `{id} = '${record.id}'`
            }
            const existingRecords = await base(tableName).select({
                filterByFormula: filterByFormulaFinal
            }).all();

            if (existingRecords.length > 0) {                
                await base(tableName).update([
                    {
                        "id": existingRecords[0].id,
                        "fields": {
                            "id": record.id,
                            "name": record.name,
                            "spend": record.spend,
                            "date_start": record.date_start,
                            "date_stop": record.date_stop,
                            "impressions": record.impressions
                        }
                    }
                ]);
                logger.info(`Record updated in Airtable: ${record.id}`);
            } else {                
                await base(tableName).create([
                    {
                        "fields": {
                            "id": record.id,
                            "name": record.name,
                            "spend": record.spend,
                            "date_start": record.date_start,
                            "date_stop": record.date_stop,
                            "impressions": record.impressions
                        }
                    }
                ]);
                logger.info(`Record created in Airtable: ${record.id}`);
            }
        }));

        logger.info('Data synchronized with Airtable successfully');
    } catch (error) {
        logger.error(`Error updating Airtable: ${error.message}`);
        throw error;
    }
};

module.exports = { updateAirtable, getAirtableRecords };
