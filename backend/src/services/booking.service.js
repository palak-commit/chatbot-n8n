const { Appointment, Slot, Doctor } = require('../models');

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function slotKey(date, time) {
    return `${normalize(date)}|${normalize(time)}`;
}

async function getAvailableSlots() {
    const slots = await Slot.findAll({
        where: { available: true },
        order: [['date', 'ASC'], ['id', 'ASC']],
        attributes: ['id', 'date', 'time'],
    });

    const bookedAppointments = await Appointment.findAll({
        where: { status: 'confirmed' },
        attributes: ['appointmentDate', 'appointmentTime'],
    });

    const bookedByDateAndTime = new Set(
        bookedAppointments.map((appointment) => slotKey(appointment.appointmentDate, appointment.appointmentTime))
    );
    const bookedWithoutDate = new Set(
        bookedAppointments
            .filter((appointment) => !normalize(appointment.appointmentDate))
            .map((appointment) => normalize(appointment.appointmentTime))
    );

    const filteredSlots = slots.filter((slot) => {
        const dateTimeKey = slotKey(slot.date, slot.time);
        if (bookedByDateAndTime.has(dateTimeKey)) return false;
        if (!normalize(slot.date) && bookedWithoutDate.has(normalize(slot.time))) return false;
        return true;
    });

    const grouped = new Map();
    for (const slot of filteredSlots) {
        const key = slot.date || 'Any day';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(slot.time);
    }

    return Array.from(grouped, ([date, times]) => ({ date, times }));
}

async function getDoctorContext() {
    const doctor = await Doctor.findOne({
        order: [['id', 'ASC']],
        attributes: ['id', 'name', 'specialization'],
    });

    if (!doctor) {
        return { doctorId: 1, doctorName: 'Doctor', specialization: 'General Physician' };
    }

    return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialization: doctor.specialization || 'General Physician',
    };
}

function resolveBookingFromPayload(payload, memory, defaultDoctorId) {
    const requested = Boolean(payload.booking)
        || payload.intent === 'book_appointment'
        || payload.action === 'book_appointment'
        || payload.confirmBooking === true;

    if (!requested) return null;

    const booking = payload.booking || {};
    const patientName = booking.patientName || payload.patientName || memory.patientName || '';
    const time = booking.time || payload.selectedTime || memory.selectedTime || '';
    const date = booking.date || payload.selectedDate || memory.selectedDate || '';
    const doctorId = booking.doctorId || defaultDoctorId || 1;

    if (!patientName || !time) return null;
    return { patientName, time, date, doctorId };
}

async function createAppointmentIfRequested(booking) {
    if (!booking || !booking.patientName || !booking.time) return null;

    const slotWhere = { time: booking.time, available: true };
    if (booking.date) slotWhere.date = booking.date;

    const slot = await Slot.findOne({
        where: slotWhere,
        order: [['id', 'ASC']],
    });
    if (!slot) return { success: false, message: 'Selected slot unavailable' };

    const existing = await Appointment.findOne({
        where: {
            appointmentDate: slot.date || null,
            appointmentTime: slot.time,
            status: 'confirmed',
        },
    });
    if (existing) return { success: false, message: 'Selected slot already booked' };

    await slot.update({ available: false });

    const appointment = await Appointment.create({
        patientName: booking.patientName,
        doctorId: booking.doctorId || 1,
        appointmentDate: slot.date || null,
        appointmentTime: slot.time,
        status: 'confirmed',
    });

    return {
        success: true,
        appointmentId: appointment.id,
        patientName: appointment.patientName,
        time: appointment.appointmentTime,
    };
}

function normalizeDoctorContext(input) {
    if (!input || typeof input !== 'object') return null;
    return {
        doctorId: input.doctorId || input.id || 1,
        doctorName: input.doctorName || input.name || 'Doctor',
        specialization: input.specialization || 'General Physician',
    };
}

module.exports = {
    getAvailableSlots,
    getDoctorContext,
    normalizeDoctorContext,
    resolveBookingFromPayload,
    createAppointmentIfRequested,
};
