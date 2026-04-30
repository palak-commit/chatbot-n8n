const express = require('express');
const authRoutes = require('./authroutes');
const slotRoutes = require('./slotroutes');
const doctorRoutes = require('./doctorroutes');
const chatRoutes = require('./chatroutes');
const appointmentRoutes = require('./appointmentroutes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/slots', slotRoutes);
router.use('/doctor', doctorRoutes);
router.use('/chat', chatRoutes);
router.use('/appointments', appointmentRoutes);

module.exports = router;
