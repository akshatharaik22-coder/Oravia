const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

const appointmentRoutes = require("./routes/appointmentRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const authRoutes = require("./routes/authRoutes");
const queueRoutes = require("./routes/queueRoutes");

const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());


// ===============================
// API ROUTES
// ===============================

app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/medical-records", medicalRecordRoutes);


// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
  });


// ===============================
// BASIC TEST ROUTE
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to ORAVIA API",
    status: "Server is running",
  });
});


// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `ORAVIA server running on port ${PORT}`
  );
});