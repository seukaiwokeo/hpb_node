require('dotenv').config();

const DB_TYPE = (process.env.DB_TYPE || 'mysql').toLowerCase();

let dbModule;

if (DB_TYPE === 'mssql') {
    dbModule = require('./database-mssql');
    console.log('MSSQL connection module loaded');
} else {
    dbModule = require('./database-mysql');
    console.log('MySQL connection module loaded');
}

module.exports = dbModule;
