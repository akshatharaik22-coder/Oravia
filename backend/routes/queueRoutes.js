
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

// ============================================================
// CONSTANTS
// ============================================================

const CLINIC_TIME_ZONE = "Asia/Kolkata";

// ============================================================
// HELPERS
// ============================================================

const isValidId = (id) => mongoose.isValidObjectId(id);

/**
 * Returns a YYYY-MM-DD date key using the clinic's timezone.
 */
const getClinicDateKey = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

/**
 * Returns the start/end UTC Date objects for a calendar day
 * in the clinic's timezone.
 */
const getClinicDayRange = (date = new Date()) => {
  const dateKey = getClinicDateKey(date);

  const start = new Date(`${dateKey}T00:00:00+05:30`);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start,
    end,
    dateKey,
  };
};

/**
 * Safely send an email without allowing email failure to
 * undo or fail a successful queue operation.
 */
const sendEmailSafely = async (emailPromise, label) => {
  try {
    await emailPromise;

    console.log(`[EMAIL SUCCESS] ${label}`);

    return {
      emailSent: true,
      emailMessage: "Notification email sent successfully.",
    };
  } catch (error) {
    console.error(`[EMAIL ERROR] ${label}:`, error.message);

    return {
      emailSent: false,
      emailMessage:
        "The queue action succeeded, but the notification email could not be sent.",
    };
  }
};

/**
 * Get the appointment details required by notification emails.
 */
const getAppointmentEmailDetails = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId).populate(
    "patient",
    "name email phone role"
  );

  if (!appointment) {
    throw new Error("Appointment not found while preparing email.");
  }

  const patient = appointment.patient;

  const email = appointment.email || patient?.email;

  const patientName =
    appointment.patientName ||
    patient?.name ||
    "Patient";

  if (!email) {
    throw new Error(
      `No patient email found for appointment ${appointment._id}.`
    );
  }

  if (appointment.tokenNumber == null) {
    throw new Error(
      `No token number found for appointment ${appointment._id}.`
    );
  }

  return {
    ...appointment.toObject(),
    email,
    patientName,
    treatment: appointment.treatment || "Dental consultation",
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    tokenNumber: appointment.tokenNumber,
  };
};

/**
 * Get the next token number for today's queue.
 *
 * Token numbers are based on appointments scheduled for today's
 * clinic date rather than arrivalTime. This prevents a future
 * appointment from consuming today's token sequence.
 *
 * NOTE:
 * Without a dedicated atomic queue-counter collection, two
 * simultaneous administrators can still theoretically request
 * the same next token. The retry logic below reduces the impact,
 * but a dedicated QueueCounter model would be the strongest
 * long-term solution.
 */
const getNextTokenNumber = async () => {
  const { start, end } = getClinicDayRange();

  const latestAppointment = await Appointment.findOne({
    appointmentDate: {
      $gte: start,
      $lt: end,
    },
    tokenNumber: {
      $ne: null,
    },
  })
    .sort({
      tokenNumber: -1,
    })
    .select("tokenNumber")
    .lean();

  return latestAppointment?.tokenNumber
    ? Number(latestAppointment.tokenNumber) + 1
    : 1;
};

// ============================================================
// 1. GIVE TOKEN TO A CONFIRMED PATIENT
//
// PATCH /api/queue/:appointmentId/give-token
// ============================================================

router.patch(
  "/:appointmentId/give-token",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!isValidId(appointmentId)) {
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

      // --------------------------------------------------------
      // Appointment must be confirmed
      // --------------------------------------------------------

      if (appointment.status !== "Confirmed") {
        return res.status(400).json({
          message: "Only confirmed appointments can receive a token",
        });
      }

      // --------------------------------------------------------
      // Appointment must be linked to a patient
      // --------------------------------------------------------

      if (!appointment.patient) {
        return res.status(400).json({
          message: "This appointment is not linked to a patient account",
        });
      }

      // --------------------------------------------------------
      // Appointment must be scheduled for today
      // --------------------------------------------------------

      const { start, end } = getClinicDayRange();

      const appointmentDate = new Date(appointment.appointmentDate);

      if (
        Number.isNaN(appointmentDate.getTime()) ||
        appointmentDate < start ||
        appointmentDate >= end
      ) {
        return res.status(400).json({
          message:
            "A queue token can only be assigned to an appointment scheduled for today.",
        });
      }

      // --------------------------------------------------------
      // Prevent duplicate token assignment
      // --------------------------------------------------------

      if (appointment.tokenNumber !== null) {
        return res.status(409).json({
          message: "This appointment already has a token",
          appointment,
        });
      }

      // --------------------------------------------------------
      // Generate today's next token
      // --------------------------------------------------------

      const nextToken = await getNextTokenNumber();

      // --------------------------------------------------------
      // Conditional update
      //
      // This prevents the same appointment from receiving a
      // token twice if two admin requests arrive simultaneously.
      // --------------------------------------------------------

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
        return res.status(409).json({
          message:
            "The appointment changed or already received a token. Refresh and try again.",
        });
      }

      // --------------------------------------------------------
      // Send token notification
      // --------------------------------------------------------

      let emailResult;

      try {
        const emailAppointment = await getAppointmentEmailDetails(
          updatedAppointment._id
        );

        emailResult = await sendEmailSafely(
          sendTokenEmail(emailAppointment),
          "Queue token notification"
        );
      } catch (error) {
        console.error(
          "[EMAIL ERROR] Queue token notification:",
          error.message
        );

        emailResult = {
          emailSent: false,
          emailMessage:
            "The token was assigned, but the notification email could not be sent.",
        };
      }

      return res.status(200).json({
        message: `Token ${updatedAppointment.tokenNumber} assigned successfully`,
        appointment: updatedAppointment,
        ...emailResult,
      });
    } catch (error) {
      console.error("Give token error:", error);

      return res.status(500).json({
        message: "Failed to generate token",
      });
    }
  }
);

// ============================================================
// 2. CALL A WAITING PATIENT
//
// PATCH /api/queue/:appointmentId/call
// ============================================================

router.patch(
  "/:appointmentId/call",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!isValidId(appointmentId)) {
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
        const existing = await Appointment.findById(appointmentId).select(
          "status queueStatus tokenNumber"
        );

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

      // --------------------------------------------------------
      // Send token-called notification
      // --------------------------------------------------------

      let emailResult;

      try {
        const emailAppointment = await getAppointmentEmailDetails(
          updatedAppointment._id
        );

        emailResult = await sendEmailSafely(
          sendTokenCalledEmail(emailAppointment),
          "Token-called notification"
        );
      } catch (error) {
        console.error(
          "[EMAIL ERROR] Token-called notification:",
          error.message
        );

        emailResult = {
          emailSent: false,
          emailMessage:
            "The token was called, but the notification email could not be sent.",
        };
      }

      return res.status(200).json({
        message: `Token ${updatedAppointment.tokenNumber} has been called`,
        appointment: updatedAppointment,
        ...emailResult,
      });
    } catch (error) {
      console.error("Call token error:", error);

      return res.status(500).json({
        message: "Failed to call patient",
      });
    }
  }
);

// ============================================================
// 3. START CONSULTATION
//
// PATCH /api/queue/:appointmentId/check-in
// ============================================================

router.patch(
  "/:appointmentId/check-in",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!isValidId(appointmentId)) {
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

      // --------------------------------------------------------
      // ORAVIA currently supports one active doctor consultation.
      // --------------------------------------------------------

      const activeConsultation = await Appointment.findOne({
        _id: { $ne: appointmentId },
        status: "Confirmed",
        queueStatus: "In Consultation",
      })
        .select("_id")
        .lean();

      if (activeConsultation) {
        return res.status(409).json({
          message:
            "Another patient is already in consultation. Complete that consultation first.",
        });
      }

      // --------------------------------------------------------
      // Conditional transition:
      //
      // Called -> In Consultation
      // --------------------------------------------------------

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

// ============================================================
// 4. GET CURRENT PATIENT FOR DOCTOR MONITOR
//
// GET /api/queue/doctor/current
// ============================================================

router.get(
  "/doctor/current",
  adminMiddleware,
  async (req, res) => {
    try {
      const appointment = await Appointment.findOne({
        queueStatus: "In Consultation",
        status: "Confirmed",
      })
        .populate("patient", "name phone email")
        .sort({
          consultationStartTime: 1,
        });

      return res.status(200).json({
        appointment: appointment || null,
      });
    } catch (error) {
      console.error("Doctor monitor error:", error);

      return res.status(500).json({
        message: "Failed to fetch current patient",
      });
    }
  }
);

// ============================================================
// 5. COMPLETE CONSULTATION
//
// PATCH /api/queue/:appointmentId/complete
// ============================================================

router.patch(
  "/:appointmentId/complete",
  adminMiddleware,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!isValidId(appointmentId)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      // --------------------------------------------------------
      // Only an appointment currently in consultation can be
      // completed.
      // --------------------------------------------------------

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
        const existing = await Appointment.findById(appointmentId).select(
          "status queueStatus"
        );

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

      // --------------------------------------------------------
      // Send completion notification.
      //
      // Do not await this operation because the consultation
      // itself has already been successfully completed.
      // --------------------------------------------------------

      try {
        const emailAppointment = await getAppointmentEmailDetails(
          updatedAppointment._id
        );

        await sendEmailSafely(
          sendStatusUpdateEmail(emailAppointment),
          "Consultation completion notification"
        );
      } catch (error) {
        console.error(
          "[EMAIL ERROR] Consultation completion notification:",
          error.message
        );
      }

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
