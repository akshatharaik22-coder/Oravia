const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    treatment: {
      type: String,
      required: true,
      trim: true,
    },

    visitDate: {
      type: Date,
      required: true,
    },

    dentalNotes: {
      type: String,
      default: "",
      trim: true,
    },

    medications: {
      type: String,
      default: "",
      trim: true,
    },

    prescription: {
      type: String,
      default: "",
      trim: true,
    },

    additionalNotes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "MedicalRecord",
  medicalRecordSchema
);