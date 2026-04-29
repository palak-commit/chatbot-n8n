const sequelize = require('../config/db');
const Doctor = require('./doctorModel');
const Slot = require('./slotModel');
const Appointment = require('./appointmentModel');

Doctor.hasMany(Appointment, { foreignKey: 'doctorId' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });

Doctor.hasMany(Slot, { foreignKey: 'doctorId' });
Slot.belongsTo(Doctor, { foreignKey: 'doctorId' });

async function syncAndSeed() {
    await sequelize.authenticate();
    console.log('[DB] Connected successfully');
    await sequelize.sync();
    console.log('[DB] Models synced successfully');

    const doctorsData = [
        {
            name: 'Dr. Palak',
            username: 'doctor_palak',
            password: 'admin123',
            specialization: 'General Physician',
            about: 'Dr. Palak has over 10 years of experience in family medicine and preventive care. She is dedicated to providing holistic healthcare for all age groups.'
        },
        {
            name: 'Dr. Rajesh',
            username: 'doctor_rajesh',
            password: 'admin123',
            specialization: 'Cardiologist',
            about: 'Dr. Rajesh is a renowned cardiologist specializing in interventional cardiology and heart failure management with 15 years of practice.'
        },
        {
            name: 'Dr. Sneha',
            username: 'doctor_sneha',
            password: 'admin123',
            specialization: 'Pediatrician',
            about: 'Dr. Sneha is a compassionate pediatrician focused on child development, immunization, and adolescent health for the past 8 years.'
        },
        {
            name: 'Dr. Amit',
            username: 'doctor_amit',
            password: 'admin123',
            specialization: 'Dermatologist',
            about: 'Dr. Amit specializes in advanced skin treatments, cosmetic dermatology, and treating complex skin allergies and infections.'
        }
    ];

    for (const doc of doctorsData) {
        const [doctor, created] = await Doctor.findOrCreate({
            where: { username: doc.username },
            defaults: doc
        });
        
        if (created) {
            console.log(`[Seed] Created new doctor: ${doc.username}`);
        } else {
            console.log(`[Seed] Doctor already exists: ${doc.username}, updating info...`);
            await Doctor.update(
                { about: doc.about, specialization: doc.specialization },
                { where: { username: doc.username } }
            );
        }
    }

    console.log('[Seed] Doctors data seeded successfully');
}

module.exports = {
    sequelize,
    Doctor,
    Slot,
    Appointment,
    syncAndSeed
};
