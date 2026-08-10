// data_reader.js

export async function readTrainingActions(db, parquetFile) {
    const result = await db.query(`
        SELECT actionId, name, hours, prov
        FROM parquet_scan('${parquetFile}')
    `);

    return result.toArray().map(row => ({
        id: String(row.actionId),
        txt: `${row.actionId}: ${row.name} (${row.hours}h)`,
        prov: row.prov
    }));
}


export async function readEmployees(db, parquetFile) {
    const result = await db.query(`
        SELECT *
        FROM parquet_scan('${parquetFile}')
    `);

    return result.toArray();
}