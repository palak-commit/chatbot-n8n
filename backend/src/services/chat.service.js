const memory = require('./chatMemory.service');
const n8n = require('./n8n.service');
const booking = require('./booking.service');
const vector = require('./vector.service');
const notificationService = require('./notification.service');
const { Appointment, Doctor, Notification } = require('../models');
const { extractPatientNameFromMessage, isLikelyName } = require('../utils/nameExtractor');
const { parseAgentReply } = require('../utils/parseAgentReply');

function normalizeApptTime(value) {
    return String(value || '')
        .trim()
        .replace(/^\d{4}-\d{2}-\d{2}[T\s]+/i, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([ap])\.?\s*m\.?\s*$/i, ' $1M')
        .toUpperCase();
}

async function ensureNotificationsForSession(sessionId, mem, doctorContext) {
    if (!sessionId || !mem.patientName || !mem.selectedTime || !mem.selectedDate) return;
    const time = normalizeApptTime(mem.selectedTime);

    const apt = await Appointment.findOne({
        where: {
            patientName: mem.patientName,
            appointmentDate: mem.selectedDate,
            appointmentTime: time,
            status: 'confirmed',
        },
        order: [['id', 'DESC']],
    });
    if (!apt) return;

    if (!apt.sessionId) await apt.update({ sessionId });

    const existingReminder = await Notification.findOne({
        where: { sessionId, type: 'reminder' },
        order: [['id', 'DESC']],
    });
    if (existingReminder) return; // instant + reminder already handled

    const doctor = apt.doctorId ? await Doctor.findByPk(apt.doctorId) : null;
    const doctorName = doctor ? doctor.name : (doctorContext && doctorContext.name) || 'Dr. Palak';

    notificationService.sendNotification(sessionId, {
        title: 'એપોઇન્ટમેન્ટ કન્ફર્મ થઈ ગઈ છે! ✅',
        body: `તમારી એપોઇન્ટમેન્ટ ${doctorName} સાથે ${apt.appointmentDate} એ ${apt.appointmentTime} વાગ્યે કન્ફર્મ થઈ ગઈ છે.`,
        url: '/',
    }).catch((err) => console.error('[Push] Fallback instant notification failed:', err));

    try {
        const [timeStr, period] = time.split(' ');
        const [hours, minutes] = timeStr.split(':').map(Number);
        let h = hours;
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        const hh = String(h).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const appDate = new Date(`${apt.appointmentDate}T${hh}:${mm}:00+05:30`);
        const reminderDate = new Date(appDate.getTime() - 30 * 60000);

        await Notification.create({
            sessionId,
            title: 'એપોઇન્ટમેન્ટ રીમાઇન્ડર ⏰',
            body: `ભૂલશો નહીં, તમારી એપોઇન્ટમેન્ટ ${doctorName} સાથે ૩૦ મિનિટમાં (${apt.appointmentTime}) છે.`,
            scheduledAt: reminderDate,
            type: 'reminder',
        });
        console.log(`[Booking] Fallback reminder scheduled for: ${reminderDate}`);
    } catch (err) {
        console.error('[Booking] Fallback reminder schedule failed:', err);
    }
}

const FALLBACK_REPLY = 'માફ કરશો, હું અત્યારે તમારી મદદ નથી કરી શકતો. કૃપા કરીને થોડીવાર પછી પ્રયત્ન કરો.';

async function handleChatMessage({ message, sessionId, doctor: inputDoctor, availableSlots: inputAvailableSlots }) {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
        return { ok: false, status: 400, body: { success: false, message: 'message is required' } };
    }

    const normalizedSessionId = sessionId || 'guest-session';
    const doctorContext = booking.normalizeDoctorContext(inputDoctor) || await booking.getDoctorContext();
    const allDoctors = await booking.getAllDoctorsContext();
    const availableSlots = Array.isArray(inputAvailableSlots) ? inputAvailableSlots : await booking.getAvailableSlots(doctorContext.doctorId);

    // Get relevant context from Vector DB
    const vectorContext = await vector.searchContext(normalizedMessage);

    const extractedName = extractPatientNameFromMessage(normalizedMessage);
    if (extractedName) memory.updateSession(normalizedSessionId, { patientName: extractedName });

    const sessionMemory = memory.getSession(normalizedSessionId);
    const requestPayload = {
        chatInput: normalizedMessage,
        message: normalizedMessage,
        sessionId: normalizedSessionId,
        doctor: doctorContext,
        allDoctors,
        availableSlots,
        memory: sessionMemory,
        vectorContext: vectorContext, // Added vector context
        knownPatientName: sessionMemory.patientName || '',
        knownSelectedTime: sessionMemory.selectedTime || '',
        knownSelectedDate: sessionMemory.selectedDate || '',
    };

    const n8nResponse = await n8n.callWebhook(requestPayload);
    if (!n8nResponse.ok) {
        const details = await n8nResponse.text();
        return {
            ok: false,
            status: 502,
            body: {
                success: false,
                message: `n8n webhook request failed (${n8nResponse.status})`,
                details: details || 'No response body from n8n',
            },
        };
    }

    const responseText = await n8nResponse.text();
    const payload = parseAgentReply(responseText);

    const memBefore = memory.getSession(normalizedSessionId);
    const candidateName = payload.patientName || payload.booking?.patientName || '';
    memory.updateSession(normalizedSessionId, {
        patientName: memBefore.patientName
            || extractedName
            || (isLikelyName(candidateName) ? candidateName : '')
            || '',
        selectedTime: payload.selectedTime || payload.booking?.time || memBefore.selectedTime || '',
        selectedDate: payload.selectedDate || payload.booking?.date || memBefore.selectedDate || '',
    });

    const bookingInput = booking.resolveBookingFromPayload(
        payload,
        memory.getSession(normalizedSessionId),
        doctorContext.doctorId,
    );
    const bookingResult = await booking.createAppointmentIfRequested(bookingInput, normalizedSessionId);
    const finalMemory = memory.getSession(normalizedSessionId);

    // Fallback: if n8n's HTTP tool created the appointment directly (without sessionId),
    // attach sessionId, fire instant push and schedule reminder here.
    await ensureNotificationsForSession(normalizedSessionId, finalMemory, doctorContext)
        .catch((err) => console.error('[Booking] ensureNotificationsForSession error:', err));

    return {
        ok: true,
        status: 200,
        body: {
            success: true,
            reply: payload.reply || FALLBACK_REPLY,
            doctor: doctorContext,
            availableSlots,
            patientName: finalMemory.patientName || '',
            selectedTime: finalMemory.selectedTime || payload.selectedTime || '',
            selectedDate: finalMemory.selectedDate || payload.selectedDate || '',
            memory: finalMemory,
            booking: bookingResult,
        },
    };
}

module.exports = { handleChatMessage };
