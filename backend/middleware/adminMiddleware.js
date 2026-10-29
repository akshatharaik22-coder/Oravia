
const authMiddleware = require("./authMiddleware");

const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    // Only authenticated admin accounts may continue.
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    return next();
  });
};

module.exports = adminMiddleware;
