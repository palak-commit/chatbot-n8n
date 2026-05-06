const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    patientName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'patient_name'
    },
    doctorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'doctor_id'
    },
    appointmentDate: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'appointment_date'
    },
    appointmentTime: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'appointment_time'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'confirmed'
    },
    sessionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'session_id'
    }
}, {
    tableName: 'appointments',
    underscored: true
});

module.exports = Appointment;
