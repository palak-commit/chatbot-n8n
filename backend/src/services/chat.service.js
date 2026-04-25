const memory = require('./chatMemory.service');
const n8n = require('./n8n.service');
const booking = require('./booking.service');
const { extractPatientNameFromMessage, isLikelyName } = require('../utils/nameExtractor');
const { parseAgentReply } = require('../utils/parseAgentReply');

const FALLBACK_REPLY = 'Hu tamari help mate ready chu.';

async function handleChatMessage({ message, sessionId, doctor: inputDoctor, availableSlots: inputAvailableSlots }) {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
        return { ok: false, status: 400, body: { success: false, message: 'message is required' } };
    }

    const normalizedSessionId = sessionId || 'guest-session';
    const doctorContext = booking.normalizeDoctorContext(inputDoctor) || await booking.getDoctorContext();
    const availableSlots = Array.isArray(inputAvailableSlots) ? inputAvailableSlots : await booking.getAvailableSlots();

    const extractedName = extractPatientNameFromMessage(normalizedMessage);
    if (extractedName) memory.updateSession(normalizedSessionId, { patientName: extractedName });

    const sessionMemory = memory.getSession(normalizedSessionId);
    const requestPayload = {
        chatInput: normalizedMessage,
        message: normalizedMessage,
        sessionId: normalizedSessionId,
        doctor: doctorContext,
        availableSlots,
        memory: sessionMemory,
        knownPatientName: sessionMemory.patientName || '',
        knownSelectedTime: sessionMemory.selectedTime || '',
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
    });

    const bookingInput = booking.resolveBookingFromPayload(
        payload,
        memory.getSession(normalizedSessionId),
        doctorContext.doctorId,
    );
    const bookingResult = await booking.createAppointmentIfRequested(bookingInput);
    const finalMemory = memory.getSession(normalizedSessionId);

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
            memory: finalMemory,
            booking: bookingResult,
        },
    };
}

module.exports = { handleChatMessage };
