const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.post('/', chatController.chat);
router.post('/tts', chatController.tts);

module.exports = router;
