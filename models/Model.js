class Model {
    constructor() {
        this.table = '';
        this.primaryKey = 'id';
        this.fillable = [];
        this.dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
    }

    _getLimitSyntax(limit = 1) {
        return this.dbType === 'mssql' ? `TOP ${limit}` : '';
    }

    _addLimitClause(query, limit = null) {
        if (this.dbType === 'mysql' && limit) {
            return `${query} LIMIT ${limit}`;
        }
        return query;
    }

    async select(connection, columns = '*') {
        const [rows] = await connection.query(`SELECT ${columns} FROM ${this.table}`);
        return rows;
    }

    async where(connection, column, value) {
        const [rows] = await connection.query(
            `SELECT * FROM ${this.table} WHERE ${column} = ?`,
            [value]
        );
        return rows;
    }

    async first(connection, columns = '*') {
        let query;
        if (this.dbType === 'mssql') {
            query = `SELECT TOP 1 ${columns} FROM ${this.table}`;
        } else {
            query = `SELECT ${columns} FROM ${this.table} LIMIT 1`;
        }
        const [rows] = await connection.query(query);
        return rows.length > 0 ? rows[0] : null;
    }

    async whereFirst(connection, column, value, columns = '*') {
        let query;
        if (this.dbType === 'mssql') {
            query = `SELECT TOP 1 ${columns} FROM ${this.table} WHERE ${column} = ?`;
        } else {
            query = `SELECT ${columns} FROM ${this.table} WHERE ${column} = ? LIMIT 1`;
        }
        const [rows] = await connection.query(query, [value]);
        return rows.length > 0 ? rows[0] : null;
    }

    async value(connection, column, whereColumn, whereValue) {
        let query;
        if (this.dbType === 'mssql') {
            query = `SELECT TOP 1 ${column} FROM ${this.table} WHERE ${whereColumn} = ?`;
        } else {
            query = `SELECT ${column} FROM ${this.table} WHERE ${whereColumn} = ? LIMIT 1`;
        }
        const [rows] = await connection.query(query, [whereValue]);
        return rows.length > 0 ? rows[0][column] : null;
    }

    async exists(connection, column, value) {
        const [rows] = await connection.query(
            `SELECT COUNT(*) as count FROM ${this.table} WHERE ${column} = ?`,
            [value]
        );
        return rows[0].count > 0;
    }

    async create(connection, data) {
        const filteredData = {};
        for (const key of this.fillable) {
            if (data.hasOwnProperty(key)) {
                filteredData[key] = data[key];
            }
        }

        const columns = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const placeholders = columns.map(() => '?').join(', ');

        let insertId;

        if (this.dbType === 'mssql') {
            const [result] = await connection.query(
                `INSERT INTO ${this.table} (${columns.join(', ')}) OUTPUT INSERTED.${this.primaryKey} VALUES (${placeholders})`,
                values
            );
            insertId = result.length > 0 ? result[0][this.primaryKey] : null;
        } else {
            const [result] = await connection.query(
                `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`,
                values
            );
            insertId = result.insertId;
        }

        if (!insertId) {
            return null;
        }

        return await this.find(connection, insertId);
    }

    async find(connection, id) {
        const [rows] = await connection.query(
            `SELECT * FROM ${this.table} WHERE ${this.primaryKey} = ?`,
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    async update(connection, id, data) {
        const filteredData = {};
        for (const key of this.fillable) {
            if (data.hasOwnProperty(key)) {
                filteredData[key] = data[key];
            }
        }

        const columns = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const setClause = columns.map(col => `${col} = ?`).join(', ');

        await connection.query(
            `UPDATE ${this.table} SET ${setClause} WHERE ${this.primaryKey} = ?`,
            [...values, id]
        );

        return await this.find(connection, id);
    }

    async delete(connection, id) {
        const [result] = await connection.query(
            `DELETE FROM ${this.table} WHERE ${this.primaryKey} = ?`,
            [id]
        );

        const affectedRows = this.dbType === 'mssql'
            ? (result.rowsAffected ? result.rowsAffected[0] : 0)
            : result.affectedRows;

        return affectedRows > 0;
    }

    async raw(connection, query, params = []) {
        const [rows] = await connection.query(query, params);
        return rows;
    }
}

module.exports = Model;
