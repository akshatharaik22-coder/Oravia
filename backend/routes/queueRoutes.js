
const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

const {
  sendTokenEmail,
  sendTokenCalledEmail,
  sendStatusUpdateEmail,
} = require("../utils/sendEmail");

// --------------------------------------------------
// HELPER: Send email without blocking queue actions
// --------------------------------------------------
const sendEmailSafely = (emailPromise, label) => {
  Promise.resolve(emailPromise).catch((error) => {
    console.error(`[EMAIL ERROR] ${label}:`, error.message);
  });
};

// --------------------------------------------------
// 1. GIVE TOKEN TO A CONFIRMED PATIENT
// PATCH /api/queue/:appointmentId/give-token
// --------------------------------------------------
router.patch(
  "/:appointmentId/give-token",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!mongoose.isValidObjectId(appointmentId)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      // Diagnostic logging: check why the appointment is rejected.
      if (appointment.status !== "Confirmed") {
        console.log("Give-token validation:", {
          appointmentId: req.params.appointmentId,
          status: appointment?.status,
          tokenNumber: appointment?.tokenNumber,
          patient: appointment?.patient,
        });

        return res.status(400).json({
          message: "Only confirmed appointments can receive a token",
        });
      }

      if (
        appointment.tokenNumber !== null &&
        appointment.tokenNumber !== undefined
      ) {
        console.log("Give-token validation:", {
          appointmentId: req.params.appointmentId,
          status: appointment?.status,
          tokenNumber: appointment?.tokenNumber,
          patient: appointment?.patient,
        });

        return res.status(409).json({
          message: "This appointment already has a token",
          appointment,
        });
      }

      if (!appointment.patient) {
        console.log("Give-token validation:", {
          appointmentId: req.params.appointmentId,
          status: appointment?.status,
          tokenNumber: appointment?.tokenNumber,
          patient: appointment?.patient,
        });

        return res.status(400).json({
          message: "This appointment is not linked to a patient account",
        });
      }

      // Use the clinic's local calendar date for daily token numbering.
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const todayStart = new Date(`${dateKey}T00:00:00+05:30`);

      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      // Find the highest token assigned today.
      const latestAppointment = await Appointment.findOne({
        tokenNumber: { $ne: null },
        arrivalTime: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
      }).sort({ tokenNumber: -1 });

      const nextToken = latestAppointment?.tokenNumber
        ? latestAppointment.tokenNumber + 1
        : 1;

      // Conditional update prevents assigning a token twice
      // to the same appointment.
      const updatedAppointment = await Appointment.findOneAndUpdate(
        {
          _id: appointmentId,
          status: "Confirmed",
          tokenNumber: null,
        },
        {
          $set: {
            tokenNumber: nextToken,
            queueStatus: "Waiting",
            arrivalTime: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedAppointment) {
        const existing = await Appointment.findById(appointmentId);

        console.log("Give-token conditional update failed:", {
          appointmentId,
          status: existing?.status,
          tokenNumber: existing?.tokenNumber,
          queueStatus: existing?.queueStatus,
          patient: existing?.patient,
        });

        return res.status(409).json({
          message:
            "The appointment changed or already received a token. Refresh and try again.",
        });
      }

      // Send the token email without delaying the response.
      sendEmailSafely(
        sendTokenEmail(updatedAppointment),
        "Queue token notification"
      );

      return res.status(200).json({
        message: `Token ${updatedAppointment.tokenNumber} assigned successfully`,
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error("Give token error:", error);

      return res.status(500).json({
        message: "Failed to generate token",
      });
    }
  }
);

// --------------------------------------------------
// 2. CALL A WAITING PATIENT
// PATCH /api/queue/:appointmentId/call
// --------------------------------------------------
router.patch("/:appointmentId/call", adminMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!mongoose.isValidObjectId(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        status: "Confirmed",
        tokenNumber: { $ne: null },
        queueStatus: "Waiting",
      },
      {
        $set: {
          queueStatus: "Called",
          calledTime: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedAppointment) {
      const existing = await Appointment.findById(appointmentId);

      if (!existing) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      return res.status(400).json({
        message:
          "Only confirmed patients with a token and Waiting queue status can be called",
        queueStatus: existing.queueStatus,
        appointmentStatus: existing.status,
      });
    }

    sendEmailSafely(
      sendTokenCalledEmail(updatedAppointment),
      "Token-called notification"
    );

    return res.status(200).json({
      message: `Token ${updatedAppointment.tokenNumber} has been called`,
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Call token error:", error);

    return res.status(500).json({
      message: "Failed to call patient",
    });
  }
});

// --------------------------------------------------
// 3. START CONSULTATION
// PATCH /api/queue/:appointmentId/check-in
// --------------------------------------------------
router.patch(
  "/:appointmentId/check-in",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!mongoose.isValidObjectId(appointmentId)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      if (appointment.status !== "Confirmed") {
        return res.status(400).json({
          message: "Only confirmed appointments can enter consultation",
        });
      }

      if (
        appointment.queueStatus !== "Called" ||
        appointment.tokenNumber == null
      ) {
        return res.status(400).json({
          message:
            "Generate a token and call the patient before starting consultation",
        });
      }

      // ORAVIA currently assumes one doctor.
      // Do not start a new consultation while another is active.
      const activeConsultation = await Appointment.findOne({
        status: "Confirmed",
        queueStatus: "In Consultation",
      });

      if (activeConsultation) {
        return res.status(409).json({
          message:
            "Another patient is already in consultation. Complete that consultation first.",
       });
      }

      const updatedAppointment = await Appointment.findOneAndUpdate(
        {
          _id: appointmentId,
          status: "Confirmed",
          queueStatus: "Called",
          tokenNumber: { $ne: null },
        },
        {
          $set: {
            queueStatus: "In Consultation",
            consultationStartTime: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedAppointment) {
        return res.status(409).json({
          message:
            "The appointment queue status changed. Refresh and try again.",
        });
      }

      return res.status(200).json({
        message: "Consultation started successfully",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error("Start consultation error:", error);

      return res.status(500).json({
        message: "Failed to start consultation",
      });
    }
  }
);

// --------------------------------------------------
// 4. GET CURRENT PATIENT FOR DOCTOR MONITOR
// GET /api/queue/doctor/current
// --------------------------------------------------
router.get("/doctor/current", adminMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      queueStatus: "In Consultation",
      status: "Confirmed",
    })
      .populate("patient", "name phone email")
      .sort({ consultationStartTime: 1 });

    return res.status(200).json({
      appointment: appointment || null,
    });
  } catch (error) {
    console.error("Doctor monitor error:", error);

    return res.status(500).json({
      message: "Failed to fetch current patient",
    });
  }
});

// --------------------------------------------------
// 5. COMPLETE CONSULTATION
// PATCH /api/queue/:appointmentId/complete
// --------------------------------------------------
router.patch(
  "/:appointmentId/complete",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!mongoose.isValidObjectId(appointmentId)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const updatedAppointment = await Appointment.findOneAndUpdate(
        {
          _id: appointmentId,
          status: "Confirmed",
          queueStatus: "In Consultation",
        },
        {
          $set: {
            queueStatus: "Completed",
            status: "Completed",
            consultationEndTime: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedAppointment) {
        const existing = await Appointment.findById(appointmentId);

        if (!existing) {
          return res.status(404).json({
            message: "Appointment not found",
          });
        }

        return res.status(400).json({
          message:
            "Only a patient currently in consultation can be completed",
          queueStatus: existing.queueStatus,
          appointmentStatus: existing.status,
        });
      }

      sendEmailSafely(
        sendStatusUpdateEmail(updatedAppointment),
        "Consultation completion notification"
      );

      return res.status(200).json({
        message: "Consultation completed successfully",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error("Complete consultation error:", error);

      return res.status(500).json({
        message: "Failed to complete consultation",
      });
    }
  }
);

module.exports = router;
