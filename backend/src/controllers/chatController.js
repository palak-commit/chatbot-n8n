const chatService = require('../services/chat.service');
const { PushSubscription } = require('../models');

exports.chat = async (req, res) => {
    try {
        const result = await chatService.handleChatMessage(req.body || {});
        return res.status(result.status).json(result.body);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.subscribe = async (req, res) => {
    try {
        const { sessionId, subscription } = req.body;
        if (!sessionId || !subscription) {
            return res.status(400).json({ success: false, message: 'sessionId and subscription are required' });
        }

        await PushSubscription.upsert({
            sessionId,
            subscription
        }, { where: { sessionId } });

        return res.json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
