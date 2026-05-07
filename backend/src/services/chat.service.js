const booking = require('./booking.service');
const n8n = require('./n8n.service');
const memory = require('./chatMemory.service');
const vector = require('./vector.service');
const { Appointment } = require('../models');
const notificationService = require('./notification.service');
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

async function attachSessionIdToAppointment(sessionId, mem) {
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
    if (apt && !apt.sessionId) await apt.update({ sessionId });
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

    // Send OneSignal notification for the chatbot response
    if (payload.reply && normalizedSessionId) {
        notificationService.sendNotification({
            message: payload.reply.length > 100 ? payload.reply.substring(0, 97) + '...' : payload.reply,
            title: 'નવો મેસેજ',
            externalId: normalizedSessionId,
            data: { sessionId: normalizedSessionId }
        }).catch(err => console.error('[Notification] Chat response error:', err));
    }

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

    await attachSessionIdToAppointment(normalizedSessionId, finalMemory)
        .catch((err) => console.error('[Booking] attachSessionIdToAppointment error:', err));

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
