const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT);
const DB_LOG_SQL = process.env.DB_LOG_SQL;
const DB_SSL = process.env.DB_SSL !== 'false';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    dialectModule: mysql2,
    dialectOptions: DB_SSL
        ? {
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        }
        : {},
    logging: DB_LOG_SQL ? (sql) => console.log(`[Sequelize SQL] ${sql}`) : false,
    dialectOptions: DB_SSL
        ? {
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            },
            connectTimeout: 60000 // 60 seconds timeout
        }
        : {
            connectTimeout: 60000
        },
    pool: {
        max: 5,
        min: 0,
        acquire: 60000,
        idle: 10000
    }
});

module.exports = sequelize;
