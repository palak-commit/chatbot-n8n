const sequelize = require('../config/db');
const Doctor = require('./doctorModel');
const Slot = require('./slotModel');
const Appointment = require('./appointmentModel');

Doctor.hasMany(Appointment, { foreignKey: 'doctorId' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });

async function syncAndSeed() {
    await sequelize.authenticate();
    console.log('[DB] Connected successfully');
    await sequelize.sync({ alter: true });
    console.log('[DB] Models synced successfully');

    const [, created] = await Doctor.findOrCreate({
        where: { username: 'doctor' },
        defaults: {
            name: 'Dr. Palak',
            username: 'doctor',
            password: 'admin123',
            specialization: 'General Physician'
        }
    });

    console.log(created ? '[Seed] Default doctor created' : '[Seed] Default doctor already exists');
}

module.exports = {
    sequelize,
    Doctor,
    Slot,
    Appointment,
    syncAndSeed
};
