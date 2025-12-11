const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function connectToDb() {
    try {
        let pool = await sql.connect(config);
        console.log("Підключено до бази даних MindTrackBD");
        return pool;
    } catch (err) {
        console.log("Помилка підключення до БД:", err);
    }
}

module.exports = { sql, connectToDb };