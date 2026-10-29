
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

const normalizeEmail = (email) =>
  typeof email === "string"
    ? email.trim().toLowerCase()
    : "";

const isValidEmail = (email) => {
  if (!email || email.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidObjectId = (id) =>
  mongoose.isValidObjectId(id);

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  role: user.role,
});

// ============================================================
// PATIENT REGISTRATION
// POST /api/auth/register
// ============================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
    } = req.body || {};

    // ----------------------------------------------------------
    // Basic validation
    // ----------------------------------------------------------

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid registration data.",
      });
    }

    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedName.length < 2 ||
      normalizedName.length > 100
    ) {
      return res.status(400).json({
        message:
          "Name must be between 2 and 100 characters.",
      });
    }

    if (
      normalizedPhone.length < 7 ||
      normalizedPhone.length > 20
    ) {
      return res.status(400).json({
        message: "Enter a valid phone number.",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long.",
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        message:
          "Password cannot exceed 128 characters.",
      });
    }

    // ----------------------------------------------------------
    // Check duplicate email
    // ----------------------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        message:
          "An account with this email already exists.",
      });
    }

    // ----------------------------------------------------------
    // Hash password
    // ----------------------------------------------------------

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    // ----------------------------------------------------------
    // Create PATIENT account
    //
    // Role is NEVER accepted from req.body.
    // Every public registration is explicitly a patient.
    // ----------------------------------------------------------

    const user = new User({
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      password: hashedPassword,
      role: "patient",
    });

    const savedUser = await user.save();

    return res.status(201).json({
      message: "Patient account created successfully.",
      user: publicUser(savedUser),
    });
  } catch (error) {
    // Handle a race condition against the unique email index.
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "An account with this email already exists.",
      });
    }

    console.error(
      "Patient registration error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to create patient account.",
    });
  }
});

// ============================================================
// PATIENT LOGIN
// POST /api/auth/login
// ============================================================
//
// IMPORTANT:
// This endpoint intentionally accepts PATIENT accounts only.
// Admins must use /admin-login.
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Patient login explicitly searches for role=patient.
    const user = await User.findOne({
      email: normalizedEmail,
      role: "patient",
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Patient login error:",
      error.message
    );

    return res.status(500).json({
      message: "Login failed.",
    });
  }
});

// ============================================================
// ADMIN LOGIN
// POST /api/auth/admin-login
// ============================================================

router.post("/admin-login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(401).json({
        message: "Invalid admin credentials.",
      });
    }

    // Admin login explicitly searches for role=admin.
    const user = await User.findOne({
      email: normalizedEmail,
      role: "admin",
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid admin credentials.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid admin credentials.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Admin login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error.message
    );

    return res.status(500).json({
      message: "Admin login failed.",
    });
  }
});

// ============================================================
// CURRENT USER
// GET /api/auth/me
// ============================================================

router.get("/me", authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.user.id)) {
      return res.status(401).json({
        message: "Invalid authenticated user.",
      });
    }

    const user = await User.findById(
      req.user.id
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "Fetch current user error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to fetch current user.",
    });
  }
});

module.exports = router;
