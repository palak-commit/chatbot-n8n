const express = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.get('/', appointmentController.getAppointments);
router.post('/', appointmentController.saveAppointment);
router.put('/:id', appointmentController.updateAppointment);

module.exports = router;
