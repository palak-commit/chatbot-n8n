const { Appointment, Doctor, Slot } = require('../models');

exports.getAppointments = async (req, res) => {
    try {
        const where = {};
        if (req.query.patientName) where.patientName = req.query.patientName;
        if (req.query.doctorId) where.doctorId = req.query.doctorId;
        if (req.query.status) where.status = req.query.status;

        const appointments = await Appointment.findAll({
            where,
            order: [['id', 'DESC']],
            include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }],
        });
        return res.json({ success: true, appointments });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.saveAppointment = async (req, res) => {
    try {
        const { patientName, doctorName, doctorId, appointmentDate, appointmentTime, status } = req.body;

        if (!patientName || !appointmentTime) {
            return res.status(400).json({ success: false, message: 'patientName and appointmentTime are required' });
        }

        const existing = await Appointment.findOne({
            where: {
                appointmentDate: appointmentDate || null,
                appointmentTime,
                status: 'confirmed',
            },
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Selected slot already booked' });
        }

        let resolvedDoctorId = doctorId;
        if (!resolvedDoctorId && doctorName) {
            const doctor = await Doctor.findOne({ where: { name: doctorName } });
            resolvedDoctorId = doctor ? doctor.id : null;
        }

        const slotWhere = { time: appointmentTime };
        if (appointmentDate) slotWhere.date = appointmentDate;
        const slot = await Slot.findOne({ where: slotWhere, order: [['id', 'ASC']] });
        if (slot) {
            await slot.update({ available: false });
        }

        const appointment = await Appointment.create({
            patientName,
            doctorId: resolvedDoctorId || 1,
            appointmentDate: appointmentDate || null,
            appointmentTime,
            status: status || 'confirmed',
        });

        return res.json({ success: true, appointment });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
