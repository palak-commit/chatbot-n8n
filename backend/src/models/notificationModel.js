const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending' // pending, sent
    },
    scheduleDate: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'schedule_date'
    },
    scheduleTime: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'schedule_time'
    },
    sessionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'session_id'
    }
}, {
    tableName: 'notifications',
    underscored: true
});

module.exports = Notification;
