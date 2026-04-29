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
        // If doctorId looks like a port or is invalid, try to find by name
        if (!resolvedDoctorId || resolvedDoctorId > 1000) {
            if (doctorName) {
                const doctor = await Doctor.findOne({ where: { name: doctorName } });
                resolvedDoctorId = doctor ? doctor.id : 1;
            } else {
                resolvedDoctorId = 1;
            }
        }

        // Try to extract date from appointmentTime if appointmentDate is missing
        let finalDate = appointmentDate;
        if (!finalDate && appointmentTime) {
            const dateMatch = appointmentTime.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) finalDate = dateMatch[1];
        }

        // Mark the slot as unavailable
        const slotWhere = { time: appointmentTime };
        if (finalDate) slotWhere.date = finalDate;
        if (resolvedDoctorId) slotWhere.doctorId = resolvedDoctorId;
        
        console.log(`[Booking] Attempting to mark slot as booked:`, slotWhere);
        
        const slot = await Slot.findOne({ where: slotWhere, order: [['id', 'ASC']] });
        if (slot) {
            await slot.update({ available: false });
            console.log(`[Booking] Slot ${slot.id} marked as unavailable`);
        } else {
            console.log(`[Booking] No matching slot found to mark as booked`);
        }

        const appointment = await Appointment.create({
            patientName,
            doctorId: resolvedDoctorId,
            appointmentDate: finalDate || null,
            appointmentTime,
            status: status || 'confirmed',
        });

        return res.json({ success: true, appointment });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
