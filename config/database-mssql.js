const sql = require('mssql');
require('dotenv').config();

let pool = null;

const config = {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const createPool = async () => {
    if (!pool) {
        pool = await new sql.ConnectionPool(config).connect();
        pool.on('error', err => {
            console.error('MSSQL Pool Error:', err);
        });
    }
    return pool;
};

const getConnection = async () => {
    const pool = await createPool();
    return pool;
};

class MSSQLConnectionWrapper {
    constructor(pool) {
        this.pool = pool;
        this.transaction = null;
        this.isTransactionActive = false;
    }

    async query(queryString, params = []) {
        try {
            const request = this.transaction
                ? new sql.Request(this.transaction)
                : new sql.Request(this.pool);

            // Add parameters if provided
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    request.input(`param${index}`, param);
                });

                // Replace ? placeholders with @param0, @param1, etc.
                let paramIndex = 0;
                queryString = queryString.replace(/\?/g, () => `@param${paramIndex++}`);
            }

            const result = await request.query(queryString);

            return [result.recordset || [], result];
        } catch (error) {
            console.error('MSSQL Query Error:', error.message);
            throw error;
        }
    }

    async beginTransaction() {
        this.transaction = new sql.Transaction(this.pool);
        await this.transaction.begin();
        this.isTransactionActive = true;
    }

    async commit() {
        if (this.transaction && this.isTransactionActive) {
            await this.transaction.commit();
            this.transaction = null;
            this.isTransactionActive = false;
        }
    }

    async rollback() {
        if (this.transaction && this.isTransactionActive) {
            await this.transaction.rollback();
            this.transaction = null;
            this.isTransactionActive = false;
        }
    }

    release() {
    }
}

const beginTransaction = async () => {
    const pool = await createPool();
    const connection = new MSSQLConnectionWrapper(pool);
    await connection.beginTransaction();
    return connection;
};

const commit = async (connection) => {
    await connection.commit();
    connection.release();
};

const rollback = async (connection) => {
    await connection.rollback();
    connection.release();
};

const closePool = async () => {
    if (pool) {
        await pool.close();
        pool = null;
    }
};

module.exports = {
    sql,
    createPool,
    getConnection,
    beginTransaction,
    commit,
    rollback,
    closePool
};
