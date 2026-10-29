
const express = require("express");
const mongoose = require("mongoose");

const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  sendPrescriptionEmail,
} = require("../utils/sendEmail");

const {
  generateMedicalRecordPDF,
} = require("../utils/pdfGenerator");

const router = express.Router();

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const hasPrescriptionDetails = (record) =>
  Boolean(record.medications?.trim()) ||
  Boolean(record.prescription?.trim());


// ======================================================
// PATIENT - GET OWN MEDICAL RECORDS
// GET /api/medical-records/mine
// ======================================================

router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      patient: req.user.id,
    })
      .sort({
        visitDate: -1,
      })
      .lean();

    return res.status(200).json(records);
  } catch (error) {
    console.error(
      "[PATIENT MEDICAL RECORDS ERROR]:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to fetch your medical history",
    });
  }
});


// ======================================================
// PATIENT - DOWNLOAD OWN MEDICAL DOCUMENT
// GET /api/medical-records/mine/:id/pdf?type=report
// GET /api/medical-records/mine/:id/pdf?type=prescription
// ======================================================

router.get(
  "/mine/:id/pdf",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const type = req.query.type || "report";

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid medical record ID",
        });
      }

      if (!["report", "prescription"].includes(type)) {
        return res.status(400).json({
          message: "Invalid document type",
        });
      }

      // Ownership check: a patient can download only
      // a medical record belonging to their account.
      const record = await MedicalRecord.findOne({
        _id: id,
        patient: req.user.id,
      })
        .populate("patient", "name email")
        .populate(
          "appointment",
          "treatment appointmentDate appointmentTime"
        );

      if (!record) {
        return res.status(404).json({
          message: "Medical record not found",
        });
      }

      if (
        type === "prescription" &&
        !hasPrescriptionDetails(record)
      ) {
        return res.status(404).json({
          message: "No prescription information is available",
        });
      }

      return generateMedicalRecordPDF(record, res, type);
    } catch (error) {
      console.error(
        "[PATIENT MEDICAL PDF ERROR]:",
        error.message
      );

      if (!res.headersSent) {
        return res.status(500).json({
          message: "Failed to generate medical document",
        });
      }

      return res.end();
    }
  }
);


// ======================================================
// ADMIN - GET ALL MEDICAL RECORDS
// GET /api/medical-records
// ======================================================

router.get("/", adminMiddleware, async (req, res) => {
  try {
    const records = await MedicalRecord.find()
      .populate("patient", "name phone email")
      .sort({
        visitDate: -1,
      });

    return res.status(200).json(records);
  } catch (error) {
    console.error(
      "[ADMIN MEDICAL RECORDS ERROR]:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to fetch medical records",
    });
  }
});


// ======================================================
// ADMIN - DOWNLOAD MEDICAL DOCUMENT
// GET /api/medical-records/:id/pdf?type=report
// GET /api/medical-records/:id/pdf?type=prescription
// ======================================================

router.get("/:id/pdf", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || "report";

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid medical record ID",
      });
    }

    if (!["report", "prescription"].includes(type)) {
      return res.status(400).json({
        message: "Invalid document type",
      });
    }

    const record = await MedicalRecord.findById(id)
      .populate("patient", "name email")
      .populate(
        "appointment",
        "treatment appointmentDate appointmentTime"
      );

    if (!record) {
      return res.status(404).json({
        message: "Medical record not found",
      });
    }

    if (
      type === "prescription" &&
      !hasPrescriptionDetails(record)
    ) {
      return res.status(404).json({
        message: "No prescription information is available",
      });
    }

    return generateMedicalRecordPDF(record, res, type);
  } catch (error) {
    console.error(
      "[ADMIN MEDICAL PDF ERROR]:",
      error.message
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate medical document",
      });
    }

    return res.end();
  }
});


// ======================================================
// ADMIN - CREATE MEDICAL RECORD
// POST /api/medical-records
// ======================================================

router.post("/", adminMiddleware, async (req, res) => {
  try {
    const {
      patient,
      appointment,
      treatment,
      visitDate,
      dentalNotes,
      medications,
      prescription,
      additionalNotes,
    } = req.body;

    // Validate required fields.
    if (
      !patient ||
      !treatment?.trim() ||
      !visitDate
    ) {
      return res.status(400).json({
        message:
          "Patient, treatment, and visit date are required",
      });
    }

    // Validate the patient ID.
    if (!isValidObjectId(patient)) {
      return res.status(400).json({
        message: "Invalid patient ID",
      });
    }

    // Confirm that the patient exists.
    const patientExists = await User.exists({
      _id: patient,
    });

    if (!patientExists) {
      return res.status(404).json({
        message: "Patient account not found",
      });
    }

    // Validate the visit date.
    const parsedVisitDate = new Date(visitDate);

    if (Number.isNaN(parsedVisitDate.getTime())) {
      return res.status(400).json({
        message: "Invalid visit date",
      });
    }

    // If an appointment was supplied, ensure it exists
    // and belongs to the selected patient.
    if (appointment) {
      if (!isValidObjectId(appointment)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const appointmentExists = await Appointment.exists({
        _id: appointment,
        patient,
      });

      if (!appointmentExists) {
        return res.status(400).json({
          message:
            "The selected appointment does not belong to this patient",
        });
      }
    }

    const record = new MedicalRecord({
      patient,
      appointment: appointment || null,
      treatment: treatment.trim(),
      visitDate: parsedVisitDate,
      dentalNotes: dentalNotes || "",
      medications: medications || "",
      prescription: prescription || "",
      additionalNotes: additionalNotes || "",
    });

    const savedRecord = await record.save();

    // Populate details for the response and email.
    await savedRecord.populate("patient", "name email");

    await savedRecord.populate(
      "appointment",
      "treatment appointmentDate appointmentTime"
    );

    let prescriptionEmailSent = false;
    let prescriptionEmailWarning = "";

    if (hasPrescriptionDetails(savedRecord)) {
      try {
        await sendPrescriptionEmail(
          savedRecord,
          savedRecord.patient,
          savedRecord.appointment
        );

        prescriptionEmailSent = true;
      } catch (emailError) {
        console.error(
          "[PRESCRIPTION EMAIL ERROR]:",
          emailError.message
        );

        prescriptionEmailWarning =
          "The medical record was saved, but the prescription email could not be sent. Please check the clinic email configuration.";
      }
    }

    return res.status(201).json({
      message: "Medical record created successfully",
      record: savedRecord,
      prescriptionEmailSent,
      prescriptionEmailWarning,
    });
  } catch (error) {
    console.error(
      "[CREATE MEDICAL RECORD ERROR]:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to create medical record",
    });
  }
});


// ======================================================
// ADMIN - UPDATE MEDICAL RECORD
// PATCH /api/medical-records/:id
// ======================================================

router.patch("/:id", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid medical record ID",
      });
    }

    const {
      treatment,
      visitDate,
      dentalNotes,
      medications,
      prescription,
      additionalNotes,
    } = req.body;

    // Build an allowlisted update object so callers cannot
    // change the patient or appointment association.
    const updateData = {};

    if (treatment !== undefined) {
      if (
        typeof treatment !== "string" ||
        !treatment.trim()
      ) {
        return res.status(400).json({
          message: "Treatment cannot be empty",
        });
      }

      updateData.treatment = treatment.trim();
    }

    if (visitDate !== undefined) {
      const parsedVisitDate = new Date(visitDate);

      if (Number.isNaN(parsedVisitDate.getTime())) {
        return res.status(400).json({
          message: "Invalid visit date",
        });
      }

      updateData.visitDate = parsedVisitDate;
    }

    for (const field of [
      "dentalNotes",
      "medications",
      "prescription",
      "additionalNotes",
    ]) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== "string") {
          return res.status(400).json({
            message: `${field} must be a string`,
          });
        }

        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid medical record fields provided",
      });
    }

    const updatedRecord =
      await MedicalRecord.findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedRecord) {
      return res.status(404).json({
        message: "Medical record not found",
      });
    }

    return res.status(200).json({
      message: "Medical record updated successfully",
      record: updatedRecord,
    });
  } catch (error) {
    console.error(
      "[UPDATE MEDICAL RECORD ERROR]:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to update medical record",
    });
  }
});

module.exports = router;
