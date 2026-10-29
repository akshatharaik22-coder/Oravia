
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Check the Authorization header.
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // 2. Extract the token.
    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing",
      });
    }

    // 3. Ensure the JWT secret is configured.
    if (!process.env.JWT_SECRET) {
      console.error("[AUTH] JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication service is not configured",
      });
    }

    // 4. Verify the JWT signature and expiration.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Validate the user ID before querying MongoDB.
    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      !mongoose.Types.ObjectId.isValid(decoded.id)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    // 6. Load the current account from the database.
    // The database, not the JWT, determines the current role.
    const user = await User.findById(decoded.id).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        message: "Account no longer exists",
      });
    }

    // 7. Reject tokens issued with a different role.
    // This invalidates a token if the user's role changed.
    if (!decoded.role || decoded.role !== user.role) {
      return res.status(401).json({
        message: "Account permissions have changed. Please log in again.",
      });
    }

    // 8. Attach trusted account information to the request.
    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    // 9. Continue to the protected route.
    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError" ||
      error.name === "CastError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired authentication token",
      });
    }

    console.error("[AUTH MIDDLEWARE ERROR]:", error.message);

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;
