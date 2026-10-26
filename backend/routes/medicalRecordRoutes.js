const express = require("express");
const mongoose = require("mongoose");

const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const { sendPrescriptionEmail } = require("../utils/sendEmail");

const {
  generateMedicalRecordPDF,
} = require("../utils/pdfGenerator");

const router = express.Router();

// PATIENT - GET OWN MEDICAL RECORDS
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      patient: req.user.id,
    }).sort({
      visitDate: -1,
    });

    res.status(200).json(records);
  } catch (error) {
    console.error("Fetching medical records error:", error);

    res.status(500).json({
      message: "Failed to fetch your medical history",
    });
  }
});
// --------------------------------------------------
// PATIENT - DOWNLOAD OWN MEDICAL DOCUMENT
// GET /api/medical-records/mine/:id/pdf?type=report
// GET /api/medical-records/mine/:id/pdf?type=prescription
// --------------------------------------------------

router.get("/mine/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || "report";

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid medical record ID",
      });
    }

    if (!["report", "prescription"].includes(type)) {
      return res.status(400).json({
        message: "Invalid document type",
      });
    }

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

    // Do not generate an empty prescription document.
    if (
      type === "prescription" &&
      !record.prescription?.trim() &&
      !record.medications?.trim()
    ) {
      return res.status(404).json({
        message: "No prescription information is available",
      });
    }

    return generateMedicalRecordPDF(record, res, type);
  } catch (error) {
    console.error("Patient medical document download error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate medical document",
      });
    }

    res.end();
  }
});

// ADMIN - GET ALL MEDICAL RECORDS
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const records = await MedicalRecord.find()
      .populate("patient", "name phone email")
      .sort({
        visitDate: -1,
      });

    res.status(200).json(records);
  } catch (error) {
    console.error("Fetching all medical records error:", error);

    res.status(500).json({
      message: "Failed to fetch medical records",
    });
  }
});
// --------------------------------------------------
// ADMIN - DOWNLOAD MEDICAL DOCUMENT
// GET /api/medical-records/:id/pdf?type=report
// GET /api/medical-records/:id/pdf?type=prescription
// --------------------------------------------------

router.get("/:id/pdf", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || "report";

    if (!mongoose.isValidObjectId(id)) {
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
      !record.prescription?.trim() &&
      !record.medications?.trim()
    ) {
      return res.status(404).json({
        message: "No prescription information is available",
      });
    }

    return generateMedicalRecordPDF(record, res, type);
  } catch (error) {
    console.error("Admin medical document download error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate medical document",
      });
    }

    res.end();
  }
});
// ADMIN - CREATE MEDICAL RECORD
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

    if (!patient || !treatment || !visitDate) {
      return res.status(400).json({
        message:
          "Patient, treatment, and visit date are required",
      });
    }

    const record = new MedicalRecord({
      patient,
      appointment: appointment || null,
      treatment,
      visitDate,
      dentalNotes: dentalNotes || "",
      medications: medications || "",
      prescription: prescription || "",
      additionalNotes: additionalNotes || "",
    });

    const savedRecord = await record.save();

// Load the patient's registered email and appointment details.
await savedRecord.populate("patient", "name email");
await savedRecord.populate(
  "appointment",
  "treatment appointmentDate appointmentTime"
);

let prescriptionEmailSent = false;
let prescriptionEmailWarning = "";

// Email the prescription only when medication or prescription
// details have actually been entered.
const hasPrescriptionDetails =
  Boolean(savedRecord.medications?.trim()) ||
  Boolean(savedRecord.prescription?.trim());

if (hasPrescriptionDetails) {
  try {
    await sendPrescriptionEmail(
      savedRecord,
      savedRecord.patient,
      savedRecord.appointment
    );

    prescriptionEmailSent = true;
  } catch (emailError) {
    console.error(
      "Prescription saved, but email delivery failed:",
      emailError
    );

    prescriptionEmailWarning =
      "The medical record was saved, but the prescription email could not be sent. Please check the clinic email configuration and try again.";
  }
}

res.status(201).json({
  message: "Medical record created successfully",
  record: savedRecord,
  prescriptionEmailSent,
  prescriptionEmailWarning,
});
  } catch (error) {
    console.error("Creating medical record error:", error);

    res.status(500).json({
      message: "Failed to create medical record",
    });
  }
});

// ADMIN - UPDATE MEDICAL RECORD
router.patch("/:id", adminMiddleware, async (req, res) => {
  try {
    const {
      treatment,
      visitDate,
      dentalNotes,
      medications,
      prescription,
      additionalNotes,
    } = req.body;

    const updatedRecord =
      await MedicalRecord.findByIdAndUpdate(
        req.params.id,
        {
          treatment,
          visitDate,
          dentalNotes: dentalNotes || "",
          medications: medications || "",
          prescription: prescription || "",
          additionalNotes: additionalNotes || "",
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

    res.status(200).json({
      message: "Medical record updated successfully",
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Updating medical record error:", error);

    res.status(500).json({
      message: "Failed to update medical record",
    });
  }
});

module.exports = router;