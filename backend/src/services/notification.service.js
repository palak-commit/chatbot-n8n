const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/**
 * Sends a push notification via OneSignal
 * @param {Object} options
 * @param {string} options.message - The notification message
 * @param {string} [options.title] - The notification title
 * @param {string} [options.externalId] - The external user ID (sessionId) to target
 * @param {Object} [options.data] - Additional data to send
 */
async function sendNotification({ message, title = 'Appointment Update', externalId, data = {} }) {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        console.warn('[OneSignal] Missing APP_ID or REST_API_KEY. Notification skipped.');
        return null;
    }

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        contents: { en: message },
        headings: { en: title },
        data: data,
    };

    if (externalId) {
        // Target specific user by their external ID (sessionId)
        payload.include_external_user_ids = [externalId];
    } else {
        // Fallback: send to all subscribed users (not recommended for appointments)
        payload.included_segments = ['Subscribed Users'];
    }

    try {
        console.log(`[OneSignal] Sending notification to ${externalId || 'all users'}: "${message.substring(0, 20)}..."`);
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (result.errors) {
            console.error('[OneSignal] API Errors:', result.errors);
        } else {
            console.log('[OneSignal] Success! Notification ID:', result.id, 'Recipients:', result.recipients);
        }
        return result;
    } catch (error) {
        console.error('[OneSignal] Error sending notification:', error);
        return null;
    }
}

module.exports = {
    sendNotification,
};
