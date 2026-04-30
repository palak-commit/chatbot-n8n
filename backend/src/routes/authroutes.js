const express = require('express');
const authController = require('../controllers/authcontroller');

const router = express.Router();

router.post('/login', authController.login);

module.exports = router;
