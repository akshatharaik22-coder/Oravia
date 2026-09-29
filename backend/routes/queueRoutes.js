const express = require("express");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

/*
  ============================================================
  GIVE TOKEN TO PATIENT
  Receptionist uses this when the patient arrives at the clinic.
  Token is generated automatically.
  ============================================================
*/
router.patch(
  "/:appointmentId/give-token",
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
            "Only confirmed appointments can receive a token",
        });
      }

      if (appointment.tokenNumber) {
        return res.status(400).json({
          message: "This appointment already has a token",
          appointment,
        });
      }

      /*
        Older appointments may not have the patient field.
        Try to connect them with the registered patient using email.
      */
      if (!appointment.patient) {
        const patient = await User.findOne({
          email: appointment.email.toLowerCase().trim(),
        });

        if (!patient) {
          return res.status(404).json({
            message:
              "Patient account could not be found for this appointment",
          });
        }

        appointment.patient = patient._id;
      }

      /*
        Generate the next token for the current clinic day.

        Token numbering starts again from 1 for a new day.
      */
      const today = new Date();

      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const latestTokenAppointment =
        await Appointment.findOne({
          tokenNumber: { $ne: null },
          arrivalTime: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        }).sort({
          tokenNumber: -1,
        });

      const nextToken =
        latestTokenAppointment &&
        latestTokenAppointment.tokenNumber
          ? latestTokenAppointment.tokenNumber + 1
          : 1;

      appointment.tokenNumber = nextToken;
      appointment.queueStatus = "Waiting";
      appointment.arrivalTime = new Date();

      const updatedAppointment =
        await appointment.save();

      res.status(200).json({
        message: "Token generated successfully",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error(
        "Give token error:",
        error.message
      );

      res.status(500).json({
        message: "Failed to generate token",
      });
    }
  }
);


/*
  ============================================================
  CALL TOKEN
  Receptionist calls a waiting patient.
  ============================================================
*/
router.patch(
  "/:appointmentId/call",
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

      if (!appointment.tokenNumber) {
        return res.status(400).json({
          message:
            "A token must be generated before calling the patient",
        });
      }

      if (appointment.queueStatus !== "Waiting") {
        return res.status(400).json({
          message:
            "Only waiting patients can be called",
        });
      }

      appointment.queueStatus = "Called";
      appointment.calledTime = new Date();

      const updatedAppointment =
        await appointment.save();

      res.status(200).json({
        message: "Patient token called",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error(
        "Call token error:",
        error.message
      );

      res.status(500).json({
        message: "Failed to call patient",
      });
    }
  }
);


/*
  ============================================================
  CHECK IN PATIENT
  Receptionist uses this after the patient's token is called
  and the patient reaches reception.

  This sends the patient into the doctor's active queue.
  ============================================================
*/
router.patch(
  "/:appointmentId/check-in",
  adminMiddleware,
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(
        req.params.appointmentId
      ).populate(
        "patient",
        "name phone email"
      );

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      if (!appointment.tokenNumber) {
        return res.status(400).json({
          message:
            "Patient must receive a token before check-in",
        });
      }

      if (appointment.queueStatus !== "Called") {
        return res.status(400).json({
          message:
            "Patient must be called before check-in",
        });
      }

      if (!appointment.patient) {
        return res.status(400).json({
          message:
            "Patient account is not linked to this appointment",
        });
      }

      appointment.queueStatus = "In Consultation";
      appointment.consultationStartTime =
        new Date();

      const updatedAppointment =
        await appointment.save();

      res.status(200).json({
        message:
          "Patient checked in successfully",
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


/*
  ============================================================
  DOCTOR MONITOR
  Returns the currently active patient.
  ============================================================
*/
router.get(
  "/doctor/current",
  async (req, res) => {
    try {
      const appointment =
        await Appointment.findOne({
          queueStatus: "In Consultation",
        })
          .populate(
            "patient",
            "name phone email"
          )
          .sort({
            consultationStartTime: 1,
          });

      res.status(200).json({
        appointment: appointment || null,
      });
    } catch (error) {
      console.error(
        "Doctor monitor error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to fetch current patient",
      });
    }
  }
);


/*
  ============================================================
  COMPLETE CONSULTATION
  This will be connected to the medical-record creation
  workflow after the doctor monitor is built.
  ============================================================
*/
router.patch(
  "/:appointmentId/complete",
  adminMiddleware,
  async (req, res) => {
    try {
      const appointment =
        await Appointment.findById(
          req.params.appointmentId
        );

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      appointment.queueStatus = "Completed";
      appointment.status = "Completed";
      appointment.consultationEndTime =
        new Date();

      const updatedAppointment =
        await appointment.save();

      res.status(200).json({
        message:
          "Consultation completed successfully",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error(
        "Complete consultation error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to complete consultation",
      });
    }
  }
);

module.exports = router;