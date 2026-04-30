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
    if (doctorId && doctorId <= 1000) return doctorId;
    if (doctorName) {
        const doctor = await Doctor.findOne({ where: { name: doctorName } });
        if (doctor) return doctor.id;
    }
    return 1;
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
    const existing = await Appointment.findOne({
        where: {
            appointmentDate: appointmentDate || null,
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
    const finalDate = deriveDate(appointmentDate, appointmentTime);

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
