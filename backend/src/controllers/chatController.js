const chatService = require('../services/chat.service');

exports.chat = async (req, res) => {
    try {
        const result = await chatService.handleChatMessage(req.body || {});
        return res.status(result.status).json(result.body);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
