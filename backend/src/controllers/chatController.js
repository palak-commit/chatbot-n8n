const chatService = require('../services/chat.service');

exports.chat = async (req, res) => {
    try {
        const result = await chatService.handleChatMessage(req.body || {});
        return res.status(result.status).json(result.body);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.tts = async (req, res) => {
    try {
        const { text, voiceId } = req.body;
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        const FINAL_VOICE_ID = voiceId || process.env.ELEVENLABS_VOICE_ID || 'dVTC43Yewy5fAIcmsISI';

        if (!ELEVENLABS_API_KEY) {
            return res.status(500).json({ success: false, error: 'ElevenLabs API Key missing in backend' });
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${FINAL_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ success: false, error: errorData });
        }

        const arrayBuffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
