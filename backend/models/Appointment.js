
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    treatment: {
      type: String,
      required: true,
      trim: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
      validate: {
        validator: (value) =>
          value instanceof Date && !Number.isNaN(value.getTime()),
        message: "Please provide a valid appointment date",
      },
    },

    appointmentTime: {
      type: String,
      required: true,
      trim: true,
    },

    symptoms: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    tokenNumber: {
      type: Number,
      default: null,
      min: 1,
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

// Efficient patient-specific appointment queries,
// including the patient's dashboard.
appointmentSchema.index({
  patient: 1,
  appointmentDate: 1,
});

// Efficient admin appointment listing.
appointmentSchema.index({
  createdAt: -1,
});

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);
