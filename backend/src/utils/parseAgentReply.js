function extractPayload(data) {
    if (Array.isArray(data) && data.length > 0) return data[0];
    return data || {};
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { return null; }
}

function parseRawResponse(responseText) {
    const cleaned = responseText
        .replace(/\s*\+\s*[\w.]+(\.join\([^)]*\))?/g, '')
        .trim();

    const direct = cleaned ? safeJsonParse(cleaned) : {};
    if (direct) return direct;

    const start = responseText.indexOf('{');
    const end = responseText.lastIndexOf('}');
    if (start !== -1 && end > start) {
        const sliced = safeJsonParse(responseText.slice(start, end + 1));
        if (sliced) return sliced;
    }

    return { reply: responseText };
}

function unwrapAgentOutput(payload) {
    if (!payload || typeof payload.output !== 'string' || payload.reply) {
        return payload;
    }

    const fenced = payload.output.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : payload.output).trim();

    const inner = safeJsonParse(candidate);
    if (inner) return { ...payload, ...inner };

    return { ...payload, reply: candidate };
}

function parseAgentReply(responseText) {
    const raw = parseRawResponse(responseText);
    return unwrapAgentOutput(extractPayload(raw));
}

module.exports = { parseAgentReply };
