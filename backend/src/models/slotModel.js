const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Slot = sequelize.define('Slot', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    date: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    time: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    doctorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'doctor_id'
    },
    available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'slots',
    underscored: true
});

module.exports = Slot;
