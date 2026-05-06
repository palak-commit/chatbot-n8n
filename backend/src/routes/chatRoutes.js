const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.post('/', chatController.chat);
router.post('/subscribe', chatController.subscribe);

module.exports = router;
