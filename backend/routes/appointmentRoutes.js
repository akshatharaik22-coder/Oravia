const express = require("express");
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  sendAppointmentEmail,
  sendStatusUpdateEmail,
} = require("../utils/sendEmail");

const router = express.Router();

// ======================================================
// HELPERS
// ======================================================

const ALLOWED_STATUSES = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

const VALID_QUEUE_STATUSES = [
  "Waiting",
  "Called",
  "In Consultation",
  "Completed",
  "Skipped",
];

/**
 * Get authenticated user ID.
 *
 * This application uses req.user.id in its existing
 * authentication middleware.
 */
function getUserId(req) {
  return req.user?.id || req.user?._id || null;
}

/**
 * Verify that a valid authenticated patient is making
 * a patient-specific request.
 */
async function getAuthenticatedPatient(req) {
  const userId = getUserId(req);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      error: {
        status: 401,
        message: "Authentication required",
      },
    };
  }

  const user = await User.findById(userId).select(
    "_id name phone email role"
  );

  if (!user) {
    return {
      error: {
        status: 401,
        message: "User account not found",
      },
    };
  }

  if (user.role !== "patient") {
    return {
      error: {
        status: 403,
        message: "Only patient accounts can perform this action",
      },
    };
  }

  return { user };
}

/**
 * Validate appointment date.
 *
 * Expected date format: YYYY-MM-DD.
 * Past dates are rejected using the server's local date.
 */
function validateAppointmentDate(dateValue) {
  if (typeof dateValue !== "string") {
    return false;
  }

  const date = dateValue.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }

  // Compare calendar dates without relying on UTC conversion.
  const now = new Date();
  const today =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return date >= today;
}

/**
 * Validate a 24-hour time such as 09:30 or 14:45.
 *
 * If your frontend uses values like "9:30 AM", update
 * this helper to match that format before deploying.
 */
function validateAppointmentTime(timeValue) {
  if (typeof timeValue !== "string") {
    return false;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue.trim());
}

/**
 * Send an email without failing the database operation
 * if the mail service is unavailable.
 */
async function sendEmailSafely(label, emailOperation) {
  try {
    await emailOperation();
  } catch (error) {
    console.error(`[EMAIL ERROR] ${label}:`, error.message);
  }
}

/**
 * Handle common Mongoose validation errors.
 */
function handleDatabaseError(res, error, fallbackMessage) {
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid appointment information",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "A conflicting record already exists",
    });
  }

  console.error(`[APPOINTMENT ERROR] ${fallbackMessage}:`, error.message);

  return res.status(500).json({
    message: fallbackMessage,
  });
}

// ======================================================
// CREATE APPOINTMENT
// POST /api/appointments
// PATIENT ONLY
// ======================================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      treatment,
      appointmentDate,
      appointmentTime,
      symptoms,
    } = req.body || {};

    // Authenticate and verify patient role.
    const result = await getAuthenticatedPatient(req);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const patient = result.user;

    // Validate required fields.
    if (
      typeof treatment !== "string" ||
      !treatment.trim() ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        message:
          "Treatment, appointment date, and appointment time are required",
      });
    }

    if (treatment.trim().length > 120) {
      return res.status(400).json({
        message: "Treatment name cannot exceed 120 characters",
      });
    }

    if (!validateAppointmentDate(appointmentDate)) {
      return res.status(400).json({
        message: "Please select a valid date that is not in the past",
      });
    }

    if (!validateAppointmentTime(appointmentTime)) {
      return res.status(400).json({
        message: "Please select a valid appointment time",
      });
    }

    if (
      symptoms !== undefined &&
      symptoms !== null &&
      typeof symptoms !== "string"
    ) {
      return res.status(400).json({
        message: "Symptoms must be text",
      });
    }

    if (typeof symptoms === "string" && symptoms.length > 2000) {
      return res.status(400).json({
        message: "Symptoms cannot exceed 2000 characters",
      });
    }

    // Create appointment using authenticated patient details.
    // Never trust patient identity supplied in req.body.
    const appointment = new Appointment({
      patient: patient._id,
      patientName: patient.name,
      phone: patient.phone,
      email: patient.email,
      treatment: treatment.trim(),
      appointmentDate: appointmentDate.trim(),
      appointmentTime: appointmentTime.trim(),
      symptoms:
        typeof symptoms === "string" ? symptoms.trim() : "",
    });

    const savedAppointment = await appointment.save();

    // Email failure must not undo a successful booking.
    await sendEmailSafely(
      "Appointment booking notification",
      () => sendAppointmentEmail(savedAppointment)
    );

    return res.status(201).json({
      message: "Appointment booked successfully",
      appointment: savedAppointment,
    });
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to book appointment"
    );
  }
});

// ======================================================
// GET MY APPOINTMENTS
// GET /api/appointments/mine
// PATIENT ONLY
// ======================================================

router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const result = await getAuthenticatedPatient(req);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const appointments = await Appointment.find({
      patient: result.user._id,
    }).sort({
      appointmentDate: 1,
      appointmentTime: 1,
      createdAt: -1,
    });

    return res.status(200).json(appointments);
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to fetch your appointments"
    );
  }
});

// ======================================================
// CANCEL MY APPOINTMENT
// PATCH /api/appointments/:id/cancel
// PATIENT ONLY
// ======================================================

router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const result = await getAuthenticatedPatient(req);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    // Ownership check: both appointment ID and patient ID.
    const appointment = await Appointment.findOne({
      _id: id,
      patient: result.user._id,
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (appointment.status === "Completed") {
      return res.status(400).json({
        message: "Completed appointments cannot be cancelled",
      });
    }

    if (appointment.status === "Cancelled") {
      return res.status(400).json({
        message: "This appointment is already cancelled",
      });
    }

    // Do not allow cancellation after consultation has begun.
    if (
      appointment.queueStatus === "In Consultation" ||
      appointment.queueStatus === "Completed"
    ) {
      return res.status(400).json({
        message:
          "This appointment cannot be cancelled after consultation has started",
      });
    }

    appointment.status = "Cancelled";
    appointment.cancelledBy = "patient";

    if (
      appointment.tokenNumber &&
      appointment.queueStatus !== "Completed"
    ) {
      appointment.queueStatus = "Skipped";
    }

    const updatedAppointment = await appointment.save();

    // Send the cancellation/status notification once.
    await sendEmailSafely(
      "Appointment cancellation notification",
      () => sendStatusUpdateEmail(updatedAppointment)
    );

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to cancel appointment"
    );
  }
});

// ======================================================
// GET ALL APPOINTMENTS
// GET /api/appointments
// ADMIN ONLY
// ======================================================

router.get("/", adminMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name phone email")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json(appointments);
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to fetch appointments"
    );
  }
});

// ======================================================
// UPDATE APPOINTMENT STATUS
// PATCH /api/appointments/:id/status
// ADMIN ONLY
// ======================================================

router.patch("/:id/status", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid appointment status",
        allowedStatuses: ALLOWED_STATUSES,
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    // Prevent accidental changes to a completed appointment.
    if (appointment.status === "Completed" && status !== "Completed") {
      return res.status(400).json({
        message: "Completed appointments cannot be reopened or cancelled",
      });
    }

    if (appointment.status === "Cancelled" && status !== "Cancelled") {
      return res.status(400).json({
        message:
          "Cancelled appointments cannot be reactivated through this endpoint",
      });
    }

    // Keep status and queue state consistent when cancelling.
    if (status === "Cancelled") {
      if (
        appointment.queueStatus === "In Consultation" ||
        appointment.queueStatus === "Completed"
      ) {
        return res.status(400).json({
          message:
            "Appointments cannot be cancelled after consultation has started",
        });
      }

      appointment.cancelledBy = "admin";

      if (appointment.tokenNumber) {
        appointment.queueStatus = "Skipped";
      }
    } else {
      appointment.cancelledBy = null;
    }

    appointment.status = status;

    const updatedAppointment = await appointment.save();

    await sendEmailSafely(
      "Appointment status update notification",
      () => sendStatusUpdateEmail(updatedAppointment)
    );

    return res.status(200).json({
      message: "Appointment status updated successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to update appointment status"
    );
  }
});

module.exports = router;