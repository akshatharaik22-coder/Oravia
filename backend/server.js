
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

dns.setServers(["8.8.8.8", "1.1.1.1"]);

// ============================================================
// APP CONFIGURATION
// ============================================================

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";

// Configure production origins as a comma-separated list.
// Example: FRONTEND_URLS=https://your-app.vercel.app
const configuredOrigins = (process.env.FRONTEND_URLS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const developmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const allowedOrigins = isProduction
  ? configuredOrigins
  : [...new Set([...developmentOrigins, ...configuredOrigins])];

// ============================================================
// SECURITY AND MIDDLEWARE
// ============================================================

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as server-to-server
      // requests and command-line health checks.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Do not grant cross-origin access to unapproved websites.
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "1mb",
  }),
);

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/invoices", invoiceRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Welcome to ORAVIA API",
    status: "Server is running",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
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
  console.error("Unhandled server error:", error);

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
      throw new Error("MONGO_URI is not configured.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    if (isProduction && process.env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must contain at least 32 characters in production.",
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`ORAVIA server running on port ${PORT}`);

      if (isProduction && allowedOrigins.length === 0) {
        console.warn(
          "FRONTEND_URLS is not configured. Browser cross-origin requests will be denied.",
        );
      }
    });
  } catch (error) {
    console.error("ORAVIA startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

// ============================================================
// DATABASE CONNECTION EVENTS
// ============================================================

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB connection re-established.");
});
