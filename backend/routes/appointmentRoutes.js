const express = require("express");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

const {
  sendAppointmentEmail,
  sendStatusUpdateEmail,
} = require("../utils/sendEmail");


// ======================================================
// CREATE APPOINTMENT - LOGGED-IN PATIENT
// ======================================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      treatment,
      appointmentDate,
      appointmentTime,
      symptoms,
    } = req.body;

    if (
      !treatment ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        message:
          "Treatment, appointment date, and appointment time are required",
      });
    }

    const patient = await User.findById(req.user.id).select(
      "-password"
    );

    if (!patient) {
      return res.status(404).json({
        message: "Patient account not found",
      });
    }

    const appointment = new Appointment({
      patient: patient._id,
      patientName: patient.name,
      phone: patient.phone,
      email: patient.email,
      treatment,
      appointmentDate,
      appointmentTime,
      symptoms: symptoms || "",
    });

    const savedAppointment = await appointment.save();

    try {
      await sendAppointmentEmail(savedAppointment);
    } catch (emailError) {
      console.error(
        "Email sending error:",
        emailError.message
      );
    }

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: savedAppointment,
    });
  } catch (error) {
    console.error(
      "Appointment booking error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to book appointment",
      error: error.message,
    });
  }
});


// ======================================================
// GET MY APPOINTMENTS - LOGGED-IN PATIENT ONLY
// ======================================================

router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.user.id,
    }).sort({
      appointmentDate: 1,
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error(
      "Fetching patient appointments error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch your appointments",
    });
  }
});


// ======================================================
// CANCEL MY APPOINTMENT
// ======================================================

router.patch(
  "/:id/cancel",
  authMiddleware,
  async (req, res) => {
    try {
      const appointment = await Appointment.findOne({
        _id: req.params.id,
        patient: req.user.id,
      });

      if (!appointment) {
        return res.status(404).json({
          message:
            "Appointment not found or does not belong to you",
        });
      }

      if (appointment.status === "Completed") {
        return res.status(400).json({
          message:
            "Completed appointments cannot be cancelled",
        });
      }

      if (appointment.status === "Cancelled") {
        return res.status(400).json({
          message: "This appointment is already cancelled",
        });
      }

      appointment.status = "Cancelled";
      appointment.cancelledBy = "patient";

      const updatedAppointment = await appointment.save();

      try {
        await sendStatusUpdateEmail(updatedAppointment);
      } catch (emailError) {
        console.error(
          "Status update email error:",
          emailError.message
        );
      }

      res.status(200).json({
        message: "Appointment cancelled successfully",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error(
        "Appointment cancellation error:",
        error.message
      );

      res.status(500).json({
        message: "Failed to cancel appointment",
      });
    }
  }
);


// ======================================================
// GET ALL APPOINTMENTS - TEMPORARILY FOR ADMIN
// ======================================================

router.get("/", adminMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name phone email")
      .sort({
        createdAt: -1,
      });

    res.status(200).json(appointments);
  } catch (error) {
    console.error(
      "Fetching appointments error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
});


// ======================================================
// UPDATE APPOINTMENT STATUS - ADMIN
// ======================================================

router.patch("/:id/status", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Completed",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid appointment status",
      });
    }

    const updateData = {
      status,
    };

    if (status === "Cancelled") {
      updateData.cancelledBy = "admin";
    } else {
      updateData.cancelledBy = null;
    }

    const updatedAppointment =
      await Appointment.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

    if (!updatedAppointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    try {
      await sendStatusUpdateEmail(updatedAppointment);
    } catch (emailError) {
      console.error(
        "Status update email error:",
        emailError.message
      );
    }

    res.status(200).json({
      message: "Appointment status updated successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error(
      "Status update error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to update appointment status",
    });
  }
});


module.exports = router;