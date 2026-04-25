const NON_NAME_WORDS = new Set([
    'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'yep', 'nope', 'sure',
    'thanks', 'thx', 'bye', 'confirm', 'cancel', 'done', 'next', 'back',
    'ha', 'haa', 'na', 'naa', 'haan', 'nahi', 'nai', 'nahin',
    'su', 'shu', 'kem', 'kon', 'કેમ', 'હા', 'ના',
    'book', 'booking', 'appointment', 'slot', 'doctor',
]);

const NAME_PATTERNS = [
    /(?:my\s+name\s+is|i\s+am)\s+([\p{L}.'-]+)/iu,
    /(?:maru\s+name\s+|hu\s+)([\p{L}.'-]+)/iu,
    /(?:maru\s+naam\s+|mara\s+naam\s+)([\p{L}.'-]+)/iu,
    /(?:મારું\s+નામ\s+|મારુ\s+નામ\s+|હું\s+)([\p{L}.'-]+)/iu,
];

function isLikelyName(value) {
    return Boolean(value) && !NON_NAME_WORDS.has(String(value).toLowerCase());
}

function extractPatientNameFromMessage(messageText) {
    const text = String(messageText || '').trim();
    if (!text) return '';

    for (const pattern of NAME_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1] && isLikelyName(match[1])) {
            return match[1].trim();
        }
    }

    if (/^[\p{L}.'-]{2,40}$/u.test(text) && isLikelyName(text)) {
        return text;
    }

    return '';
}

module.exports = {
    NON_NAME_WORDS,
    isLikelyName,
    extractPatientNameFromMessage,
};
