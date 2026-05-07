
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
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
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

        const data = await response.json();
        if (data.errors && data.errors.length > 0) {
            console.error(`[OneSignal] Error response for ${sessionId}:`, data.errors);
            // If it still fails with 403, we might need to try 'Key' again but with include_aliases
            // However, let's try 'Basic' first as it's the standard for REST APIs
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