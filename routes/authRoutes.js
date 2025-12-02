const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  getUserProfile,
  forgotPassword,
  resetPassword,
  updateProfile
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// Auth
router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getUserProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.put("/update-profile", protect, updateProfile);

module.exports = router;
