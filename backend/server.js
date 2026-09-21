
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const appointmentRoutes = require("./routes/appointmentRoutes");

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/appointments", appointmentRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// Basic test route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to ORAVIA API",
    status: "Server is running",
  });
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ORAVIA server running on port ${PORT}`);
});
