
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");

require("dotenv").config();

// ============================================================
// ROUTES
// ============================================================

const appointmentRoutes = require("./routes/appointmentRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const authRoutes = require("./routes/authRoutes");
const queueRoutes = require("./routes/queueRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

// ============================================================
// DNS
// ============================================================

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

// ============================================================
// APP
// ============================================================

const app = express();

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT) || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ============================================================
// API ROUTES
// ============================================================

app.use(
  "/api/appointments",
  appointmentRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/queue",
  queueRoutes
);

app.use(
  "/api/medical-records",
  medicalRecordRoutes
);

app.use(
  "/api/invoices",
  invoiceRoutes
);

// ============================================================
// BASIC HEALTH / TEST ROUTE
// ============================================================

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Welcome to ORAVIA API",
    status: "Server is running",
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  return res.status(404).json({
    message: "API endpoint not found.",
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
  console.error(
    "Unhandled server error:",
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error.",
  });
});

// ============================================================
// START SERVER AFTER DATABASE CONNECTION
// ============================================================

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not configured."
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is not configured."
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected successfully"
    );

    app.listen(PORT, () => {
      console.log(
        `ORAVIA server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "ORAVIA startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();

// ============================================================
// DATABASE CONNECTION EVENTS
// ============================================================

mongoose.connection.on(
  "disconnected",
  () => {
    console.warn(
      "MongoDB connection disconnected."
    );
  }
);

mongoose.connection.on(
  "reconnected",
  () => {
    console.log(
      "MongoDB connection re-established."
    );
  }
);
