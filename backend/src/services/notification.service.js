const webpush = require('web-push');
const { PushSubscription } = require('../models');

// Configure VAPID keys
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@healthcare.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function sendNotification(sessionId, payload) {
    try {
        const subRecord = await PushSubscription.findOne({ where: { sessionId } });
        if (!subRecord) {
            console.warn(`[Push] No subscription found for session: ${sessionId}`);
            return false;
        }

        const pushConfig = subRecord.subscription;
        await webpush.sendNotification(pushConfig, JSON.stringify(payload));
        console.log(`[Push] Notification sent to session: ${sessionId}`);
        return true;
    } catch (error) {
        console.error('[Push] Error sending notification:', error);
        if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription has expired or is no longer valid
            await PushSubscription.destroy({ where: { sessionId } });
            console.log(`[Push] Invalid subscription removed for session: ${sessionId}`);
        }
        return false;
    }
}

module.exports = { sendNotification };