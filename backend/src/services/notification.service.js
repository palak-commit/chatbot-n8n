
async function sendNotification(sessionId, payload) {
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        console.log(`[Notification] OneSignal keys missing. Skipping push for session: ${sessionId}`);
        return true;
    }

    try {
        const response = await fetch('https://api.onesignal.com/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_external_user_ids: [sessionId],
                headings: { en: payload.title || 'Health Notification' },
                contents: { en: payload.body || 'You have a new message.' },
                url: payload.url || '/'
            })
        });

        const data = await response.json();
        if (data.errors && data.errors.length > 0) {
            console.error(`[OneSignal] Error response for ${sessionId}:`, data.errors);
            return false;
        }
        console.log(`[OneSignal] Notification success for ${sessionId}:`, data);
        return true;
    } catch (error) {
        console.error(`[OneSignal] Error sending notification to ${sessionId}:`, error);
        return false;
    }
}

module.exports = { sendNotification };