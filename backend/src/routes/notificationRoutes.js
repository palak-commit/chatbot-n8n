const express = require('express');
const { Notification, Doctor } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notification.service');

const router = express.Router();

/**
 * Endpoint to manually trigger notification processing (useful for Vercel Cron)
 */
router.get('/process', async (req, res) => {
    try {
        console.log('[Cron] Triggered: Checking for pending notifications...');
        
        const now = new Date();
        
        // 1. Process pending notifications
        const pendingNotifications = await Notification.findAll({
            where: {
                status: 'pending',
                scheduledAt: {
                    [Op.lte]: now
                }
            }
        });

        let sentCount = 0;
        let failedCount = 0;

        for (const notif of pendingNotifications) {
            const success = await notificationService.sendNotification(notif.sessionId, {
                title: notif.title,
                body: notif.body,
                url: '/'
            });

            if (success) {
                await notif.update({ status: 'sent' });
                sentCount++;
            } else {
                await notif.update({ status: 'failed' });
                failedCount++;
            }
        }

        // 2. Cleanup: Delete notifications that were sent more than 3 days ago
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const deletedCount = await Notification.destroy({
            where: {
                status: 'sent',
                updatedAt: {
                    [Op.lte]: threeDaysAgo
                }
            }
        });

        return res.json({
            success: true,
            processed: pendingNotifications.length,
            sent: sentCount,
            failed: failedCount,
            deleted: deletedCount
        });
    } catch (error) {
        console.error('[Cron] Manual trigger error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
