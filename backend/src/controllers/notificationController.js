const { Notification } = require('../models');

exports.getNotifications = async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'sessionId is required' });
        }

        const notifications = await Notification.findAll({
            where: { sessionId },
            order: [['createdAt', 'DESC']]
        });

        return res.json({ success: true, notifications });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
