const express = require("express");
const MedicalRecord = require("../models/MedicalRecord");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

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

    res.status(201).json({
      message: "Medical record created successfully",
      record: savedRecord,
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