const appointmentService = require('../services/appointment.service');

exports.getAppointments = async (req, res) => {
    try {
        const appointments = await appointmentService.listAppointments(req.query);
        return res.json({ success: true, appointments });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.saveAppointment = async (req, res) => {
    try {
        const { patientName, appointmentTime, appointmentDate } = req.body;
        
        // Basic presence check
        if (!patientName) {
            return res.status(400).json({ success: false, message: 'patientName is required' });
        }
        if (!appointmentTime || String(appointmentTime).includes('confirmed')) {
            return res.status(400).json({ success: false, message: 'A valid appointmentTime is required' });
        }
        if (!appointmentDate) {
            return res.status(400).json({ success: false, message: 'appointmentDate is required' });
        }

        const appointment = await appointmentService.createAppointment(req.body);
        return res.json({ success: true, appointment });
    } catch (error) {
        if (error.code === 'SLOT_TAKEN') {
            return res.status(409).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, error: error.message });
    }
};
