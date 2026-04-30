const { Appointment, Doctor, Slot } = require('../models');

async function listAppointments({ patientName, doctorId, status } = {}) {
    const where = {};
    if (patientName) where.patientName = patientName;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    return Appointment.findAll({
        where,
        order: [['id', 'DESC']],
        include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }],
    });
}

async function resolveDoctorId(doctorId, doctorName) {
    // n8n sometimes passes a port number or stale id; fall back to name lookup, then default doctor.
    if (doctorId && doctorId < 10000) return doctorId;
    if (doctorName) {
        // Clean the name (remove specialization like "(Cardiologist)")
        const cleanName = doctorName.split('(')[0].trim();
        const doctor = await Doctor.findOne({ 
            where: { 
                name: { [require('sequelize').Op.like]: `%${cleanName}%` } 
            } 
        });
        if (doctor) return doctor.id;
    }
    // Fallback to first available doctor id if name lookup fails
    const firstDoctor = await Doctor.findOne({ order: [['id', 'ASC']] });
    return firstDoctor ? firstDoctor.id : 1;
}

function deriveDate(appointmentDate, appointmentTime) {
    if (appointmentDate) return appointmentDate;
    const match = appointmentTime && appointmentTime.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

async function markSlotBooked({ doctorId, date, time }) {
    const where = { time };
    if (date) where.date = date;
    if (doctorId) where.doctorId = doctorId;

    console.log('[Booking] Attempting to mark slot as booked:', where);
    const slot = await Slot.findOne({ where, order: [['id', 'ASC']] });
    if (slot) {
        await slot.update({ available: false });
        console.log(`[Booking] Slot ${slot.id} marked as unavailable`);
    } else {
        console.log('[Booking] No matching slot found to mark as booked');
    }
}

async function createAppointment({ patientName, doctorName, doctorId, appointmentDate, appointmentTime, status }) {
    const finalDate = deriveDate(appointmentDate, appointmentTime);
    
    if (!finalDate) {
        throw new Error('A valid appointment date is required');
    }

    const isPlaceholder = appointmentTime && (
        appointmentTime.includes('confirmed') || 
        appointmentTime.includes('to be') || 
        appointmentTime.toLowerCase().includes('any')
    );

    if (isPlaceholder) {
        throw new Error('A valid appointment time is required');
    }

    const existing = await Appointment.findOne({
        where: {
            appointmentDate: finalDate,
            appointmentTime,
            status: 'confirmed',
        },
    });
    if (existing) {
        const err = new Error('Selected slot already booked');
        err.code = 'SLOT_TAKEN';
        throw err;
    }

    const resolvedDoctorId = await resolveDoctorId(doctorId, doctorName);

    await markSlotBooked({ doctorId: resolvedDoctorId, date: finalDate, time: appointmentTime });

    return Appointment.create({
        patientName,
        doctorId: resolvedDoctorId,
        appointmentDate: finalDate,
        appointmentTime,
        status: status || 'confirmed',
    });
}

module.exports = { listAppointments, createAppointment };
