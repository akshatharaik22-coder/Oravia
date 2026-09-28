const express = require("express");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// CHECK IN PATIENT AND GENERATE TOKEN
router.patch(
  "/:appointmentId/check-in",
  adminMiddleware,
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(
        req.params.appointmentId
      );

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      if (appointment.status !== "Confirmed") {
        return res.status(400).json({
          message:
            "Only confirmed appointments can be checked in",
        });
      }

      if (appointment.tokenNumber) {
        return res.status(400).json({
          message:
            "This patient has already been checked in",
          appointment,
        });
      }

      // ----------------------------------------------------
      // Make sure older appointments have a patient ID
      // ----------------------------------------------------

      if (!appointment.patient) {
        const patient = await User.findOne({
          email: appointment.email,
        });

        if (!patient) {
          return res.status(404).json({
            message:
              "Patient account could not be found for this appointment",
          });
        }

        appointment.patient = patient._id;
      }

      // ----------------------------------------------------
      // Generate next token number
      // ----------------------------------------------------

      const latestTokenAppointment =
        await Appointment.findOne({
          tokenNumber: { $ne: null },
        }).sort({
          tokenNumber: -1,
        });

      const nextToken =
        latestTokenAppointment &&
        latestTokenAppointment.tokenNumber
          ? latestTokenAppointment.tokenNumber + 1
          : 1;

      // ----------------------------------------------------
      // Update queue information
      // ----------------------------------------------------

      appointment.tokenNumber = nextToken;
      appointment.queueStatus = "Waiting";
      appointment.arrivalTime = new Date();

      const updatedAppointment =
        await appointment.save();

      res.status(200).json({
        message:
          "Patient checked in and token generated successfully",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error(
        "Patient check-in error:",
        error.message
      );

      res.status(500).json({
        message: "Failed to check in patient",
      });
    }
  }
);

module.exports = router;