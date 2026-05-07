
async function sendNotification(sessionId, payload) {
    const ONESIGNAL_APP_ID = (process.env.ONESIGNAL_APP_ID || '').trim();
    const ONESIGNAL_REST_API_KEY = (process.env.ONESIGNAL_REST_API_KEY || '').trim();

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        console.log(`[Notification] OneSignal keys missing. Skipping push for session: ${sessionId}`);
        return true;
    }

    try {
        // Using the recommended v2 URL and the 'Basic' prefix which is still common for many Node.js integrations
        // Also switching to include_aliases for better compatibility with newer OneSignal versions
        const response = await fetch('https://api.onesignal.com/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_aliases: {
                    external_id: [sessionId]
                },
                target_channel: 'push',
                headings: { en: payload.title || 'Health Notification' },
                contents: { en: payload.body || 'You have a new message.' },
                url: payload.url || '/'
            })
        });

        const raw = await response.text();
        let data = {};
        try { data = JSON.parse(raw); } catch (_) {}

        if (!response.ok || (data.errors && data.errors.length > 0)) {
            console.error(`[OneSignal] ${response.status} for ${sessionId}:`, raw);
            return false;
        }
        const recipients = data.recipients ?? 'unknown';
        if (recipients === 0) {
            console.warn(`[OneSignal] 0 recipients for ${sessionId} — external_id not linked to a Subscribed user. id=${data.id}`);
            return false;
        }
        console.log(`[OneSignal] Sent to ${recipients} for ${sessionId}: id=${data.id}`);
        return true;
    } catch (error) {
        console.error(`[OneSignal] Error sending notification to ${sessionId}:`, error);
        return false;
    }
}

module.exports = { sendNotification };