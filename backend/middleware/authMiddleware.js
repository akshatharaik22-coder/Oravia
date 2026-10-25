const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication service is not configured",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    // Verify that the account still exists.
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Account no longer exists",
      });
    }

    // Do not trust an old JWT role if the database role has changed.
    if (user.role !== decoded.role) {
      return res.status(401).json({
        message: "Account permissions have changed. Please log in again.",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "CastError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired authentication token",
      });
    }

    console.error("Authentication middleware error:", error.message);

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;