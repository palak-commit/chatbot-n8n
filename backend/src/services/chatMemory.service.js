const store = new Map();

function emptyMemory() {
    return { patientName: '', selectedTime: '' };
}

function getSession(sessionId) {
    if (!store.has(sessionId)) store.set(sessionId, emptyMemory());
    return store.get(sessionId);
}

function updateSession(sessionId, updates = {}) {
    const current = getSession(sessionId);
    const next = {
        patientName: updates.patientName || current.patientName || '',
        selectedTime: updates.selectedTime || current.selectedTime || '',
    };
    store.set(sessionId, next);
    return next;
}

function clearSession(sessionId) {
    store.delete(sessionId);
}

module.exports = { getSession, updateSession, clearSession };
