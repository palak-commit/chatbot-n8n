const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Doctor = sequelize.define('Doctor', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    specialization: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    about: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'doctors',
    underscored: true
});

module.exports = Doctor;
