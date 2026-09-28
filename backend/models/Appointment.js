const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    patientName: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    treatment: {
      type: String,
      required: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
    },

    appointmentTime: {
      type: String,
      required: true,
    },

    symptoms: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
    tokenNumber: {
      type: Number,
      default: null,
    },

    queueStatus: {
      type: String,
      enum: [
        "Waiting",
        "Called",
        "In Consultation",
        "Completed",
        "Skipped",
      ],
      default: "Waiting",
    },
    arrivalTime: {
      type: Date,
      default: null,
    },
    calledTime: {
      type: Date,
      default: null,
    },

    consultationStartTime: {
      type: Date,
      default: null,
    },

    consultationEndTime: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ["patient", "admin"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);