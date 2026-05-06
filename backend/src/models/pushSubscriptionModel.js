const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PushSubscription = sequelize.define('PushSubscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subscription: {
        type: DataTypes.JSON,
        allowNull: false,
    }
});

module.exports = PushSubscription;