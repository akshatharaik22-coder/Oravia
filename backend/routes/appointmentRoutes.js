const express = require("express");
const Appointment = require("../models/Appointment");


const router = express.Router();
const {
  sendAppointmentEmail,
  sendStatusUpdateEmail,
} = require("../utils/sendEmail");

// Create a new appointment
router.post("/", async (req, res) => {
  try {
    const appointment = new Appointment(req.body);

    const savedAppointment = await appointment.save();
    try{
      await sendAppointmentEmail(savedAppointment);
    }catch (emailError) {
      console.error("Email sending error:", emailError.message);
    }

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: savedAppointment,
    });
  } catch (error) {
    console.error("Appointment booking error:", error.message);

    res.status(500).json({
      message: "Failed to book appointment",
      error: error.message,
    });
  }
});

// Get all appointments
router.get("/", async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({
      createdAt: -1,
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Fetching appointments error:", error.message);

    res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
});
// Update appointment status
router.patch("/:id/status", async (req, res) => {
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

    // Find the appointment first
    const existingAppointment = await Appointment.findById(
      req.params.id
    );

    if (!existingAppointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    // Don't send another email if status hasn't changed
    if (existingAppointment.status === status) {
      return res.status(400).json({
        message: `Appointment is already ${status}`,
      });
    }

    // Update status
    existingAppointment.status = status;

    const updatedAppointment = await existingAppointment.save();

    // Send status email
    if (
      status === "Confirmed" ||
      status === "Cancelled" ||
      status === "Completed"
    ) {
      try {
        await sendStatusUpdateEmail(updatedAppointment);
        console.log(
          `Status email sent for ${status} appointment`
        );
      } catch (emailError) {
        console.error(
          "Status email failed:",
          emailError.message
        );
      }
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
      error: error.message,
    });
  }
});

module.exports = router;