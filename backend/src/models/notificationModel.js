const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    sessionId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'session_id'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'scheduled_at'
    },
    status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed'),
        defaultValue: 'pending'
    },
    type: {
        type: DataTypes.STRING(50), // 'confirmation', 'reminder'
        allowNull: true
    }
}, {
    tableName: 'notifications',
    underscored: true
});

module.exports = Notification;
