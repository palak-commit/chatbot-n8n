function getWebhookUrl() {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
        throw new Error('N8N_WEBHOOK_URL is not set in environment');
    }
    return url;
}

async function postJson(url, payload) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

async function callWebhook(payload, webhookUrl = getWebhookUrl()) {
    const response = await postJson(webhookUrl, payload);
    if (response.ok) return response;

    if (webhookUrl.includes('/webhook-test/')) {
        const productionUrl = webhookUrl.replace('/webhook-test/', '/webhook/');
        return postJson(productionUrl, payload);
    }

    return response;
}

module.exports = { callWebhook, getWebhookUrl };
