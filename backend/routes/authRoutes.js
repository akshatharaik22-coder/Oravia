const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Patient registration
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    // Check required fields
    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Minimum password length
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Check whether email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create patient account
    const user = new User({
      name: name.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "patient",
    });

    const savedUser = await user.save();

    res.status(201).json({
      message: "Patient account created successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        phone: savedUser.phone,
        email: savedUser.email,
        role: savedUser.role,
      },
    });
  } catch (error) {
    console.error("Patient registration error:", error.message);

    res.status(500).json({
      message: "Failed to create patient account",
    });
  }
});
// Patient login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find patient by email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Patient login error:", error.message);

    res.status(500).json({
      message: "Login failed",
    });
  }
});
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: "admin",
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid admin credentials",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid admin credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error.message
    );

    res.status(500).json({
      message: "Admin login failed",
    });
  }
});
// Get logged-in patient profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "Patient account not found",
      });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Fetching patient profile error:", error.message);

    res.status(500).json({
      message: "Failed to fetch patient profile",
    });
  }
});
module.exports = router;