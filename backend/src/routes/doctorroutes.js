const express = require('express');
const doctorController = require('../controllers/doctorcontroller');

const router = express.Router();

router.get('/', doctorController.getDoctor);

module.exports = router;
