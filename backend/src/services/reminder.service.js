const cron = require('node-cron');
const { Op } = require('sequelize');
const { Notification } = require('../models');
const notificationService = require('./notification.service');

function startReminderCron() {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        try {
            console.log('[Reminder] Checking for pending notifications...');
            
            const now = new Date();
            
            // Find all pending notifications where scheduledAt is in the past or now
            const pendingNotifications = await Notification.findAll({
                where: {
                    status: 'pending',
                    scheduledAt: {
                        [Op.lte]: now
                    }
                }
            });

            console.log(`[Reminder] Found ${pendingNotifications.length} notifications to send.`);

            for (const notif of pendingNotifications) {
                console.log(`[Reminder] Sending notification ${notif.id} to session ${notif.sessionId}`);
                
                const success = await notificationService.sendNotification(notif.sessionId, {
                    title: notif.title,
                    body: notif.body,
                    url: '/'
                });

                if (success) {
                    await notif.update({ status: 'sent' });
                } else {
                    await notif.update({ status: 'failed' });
                }
            }

            // Cleanup: Delete notifications that were sent more than 3 days ago
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            const deletedCount = await Notification.destroy({
                where: {
                    status: 'sent',
                    updatedAt: {
                        [Op.lte]: threeDaysAgo
                    }
                }
            });
            if (deletedCount > 0) {
                console.log(`[Cleanup] Deleted ${deletedCount} old notifications.`);
            }
        } catch (error) {
            console.error('[Reminder] Cron error:', error);
        }
    });
}

module.exports = { startReminderCron };
