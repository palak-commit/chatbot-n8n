const { Op } = require('sequelize');
const { Appointment, Doctor, Slot } = require('../models');
const notificationService = require('./notification.service');

function normalizeTime(value) {
    if (!value) return value;
    let s = String(value)
        .trim()
        .replace(/^\d{4}-\d{2}-\d{2}[T\s]+/i, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([ap])\.?\s*m\.?\s*$/i, ' $1M')
        .toUpperCase();

    // Convert 24-hour "HH:MM" or "HH:MM:SS" to 12-hour "HH:MM AM/PM" so it matches slots.time
    const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m24) {
        let h = parseInt(m24[1], 10);
        const mm = m24[2];
        const period = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        s = `${String(h).padStart(2, '0')}:${mm} ${period}`;
    }
    return s;
}

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
    if (doctorId) {
        const found = await Doctor.findOne({ where: { id: doctorId }, attributes: ['id'] });
        if (found) return found.id;
    }
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
    if (appointmentDate && appointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)) return appointmentDate;
    
    // Try to extract date from appointmentTime (e.g., "2026-05-14 01:00 PM")
    const match = appointmentTime && String(appointmentTime).match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    // If appointmentDate is provided but not in ISO format, try to parse it
    if (appointmentDate) {
        const d = new Date(appointmentDate);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    }
    return null;
}

async function markSlotBooked({ doctorId, date, time }) {
    const normalizedTime = normalizeTime(time);
    const baseWhere = {};
    if (date) baseWhere.date = date;
    if (doctorId) baseWhere.doctorId = doctorId;

    console.log('[Booking] Attempting to mark slot as booked:', { ...baseWhere, time: normalizedTime });

    let slot = await Slot.findOne({ where: { ...baseWhere, time: normalizedTime }, order: [['id', 'ASC']] });
    if (!slot) {
        slot = await Slot.findOne({
            where: { ...baseWhere, time: { [Op.like]: normalizedTime.replace(/\s+/g, '%') } },
            order: [['id', 'ASC']],
        });
    }
    if (slot) {
        await slot.update({ available: false });
        console.log(`[Booking] Slot ${slot.id} marked as unavailable`);
        return true;
    }
    console.log('[Booking] No matching slot found to mark as booked');
    return false;
}

async function createAppointment({ patientName, doctorName, doctorId, appointmentDate, appointmentTime, status, sessionId }) {
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

    const finalTime = normalizeTime(appointmentTime);
    const resolvedDoctorId = await resolveDoctorId(doctorId, doctorName);

    const existing = await Appointment.findOne({
        where: {
            appointmentDate: finalDate,
            appointmentTime: finalTime,
            doctorId: resolvedDoctorId,
            status: 'confirmed',
        },
    });
    if (existing) {
        const err = new Error('Selected slot already booked');
        err.code = 'SLOT_TAKEN';
        throw err;
    }

    await markSlotBooked({ doctorId: resolvedDoctorId, date: finalDate, time: finalTime });

    const appointment = await Appointment.create({
        patientName,
        doctorId: resolvedDoctorId,
        appointmentDate: finalDate,
        appointmentTime: finalTime,
        status: status || 'confirmed',
        sessionId: sessionId || null,
    });

    // Safety net: ensure the slot is marked unavailable even if the first pass missed.
    await Slot.update(
        { available: false },
        { where: { doctorId: resolvedDoctorId, date: finalDate, time: finalTime } },
    );

    // Send OneSignal notification if appointment is confirmed
    if (appointment.status === 'confirmed' && sessionId) {
        notificationService.sendNotification({
            message: `તમારી એપોઈન્ટમેન્ટ ${finalDate} ના રોજ ${finalTime} વાગ્યે કન્ફર્મ થઈ ગઈ છે.`,
            title: 'એપોઈન્ટમેન્ટ કન્ફર્મ!',
            externalId: sessionId,
            data: { appointmentId: appointment.id }
        }).catch(err => console.error('[Notification] Error sending on create:', err));
    }

    return appointment;
}

async function updateAppointment(id, data) {
    const appointment = await Appointment.findByPk(id);
    if (!appointment) throw new Error('Appointment not found');

    const { patientName, doctorName, doctorId, appointmentDate, appointmentTime, status } = data;

    if (patientName) appointment.patientName = patientName;
    
    // If status is changed to cancelled, free up the slot
    if (status && status.toLowerCase() === 'cancelled') {
        appointment.status = 'cancelled';
        await Slot.update(
            { available: true },
            { 
                where: { 
                    doctorId: appointment.doctorId, 
                    date: appointment.appointmentDate, 
                    time: appointment.appointmentTime 
                } 
            }
        );
    } else if (status) {
        appointment.status = status;
    }

    let finalDoctorId = appointment.doctorId;
    if (doctorId || doctorName) {
        finalDoctorId = await resolveDoctorId(doctorId, doctorName);
        appointment.doctorId = finalDoctorId;
    }

    if (appointmentDate || appointmentTime) {
        // Before changing, we could free the old slot, but usually updates 
        // in this flow are confirmations or slight shifts. 
        // For a full move, we'd free the old one first:
        await Slot.update(
            { available: true },
            { 
                where: { 
                    doctorId: appointment.doctorId, 
                    date: appointment.appointmentDate, 
                    time: appointment.appointmentTime 
                } 
            }
        );

        const newDate = deriveDate(appointmentDate || appointment.appointmentDate, appointmentTime || appointment.appointmentTime);
        const newTime = normalizeTime(appointmentTime || appointment.appointmentTime);
        
        appointment.appointmentDate = newDate;
        appointment.appointmentTime = newTime;

        // Mark new slot as booked
        await markSlotBooked({ doctorId: finalDoctorId, date: newDate, time: newTime });
    }

    await appointment.save();

    // Send OneSignal notification if appointment is confirmed
    if (appointment.status === 'confirmed' && appointment.sessionId) {
        notificationService.sendNotification({
            message: `તમારી એપોઈન્ટમેન્ટ અપડેટ થઈ ગઈ છે: ${appointment.appointmentDate} @ ${appointment.appointmentTime}`,
            title: 'એપોઈન્ટમેન્ટ અપડેટ!',
            externalId: appointment.sessionId,
            data: { appointmentId: appointment.id }
        }).catch(err => console.error('[Notification] Error sending on update:', err));
    }

    return appointment;
}

async function cancelAppointment(id) {
    const appointment = await Appointment.findByPk(id);
    if (!appointment) throw new Error('Appointment not found');

    appointment.status = 'cancelled';
    await appointment.save();

    // Mark the slot as available again
    await Slot.update(
        { available: true },
        { 
            where: { 
                doctorId: appointment.doctorId, 
                date: appointment.appointmentDate, 
                time: appointment.appointmentTime 
            } 
        }
    );

    return appointment;
}

module.exports = {
    listAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
};
