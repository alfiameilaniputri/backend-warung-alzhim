const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getUserProfile,
  forgotPassword,
  resetPassword,
  updateProfile,
  updateActiveStatus,
  getStoreStatus,
} = require("../controllers/authController");

const uploadImage = require("../middleware/uploadImages");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Auth
router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getUserProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.put("/update-profile", protect, uploadImage, updateProfile);
router.put("/update-active", protect, adminOnly, updateActiveStatus);
router.get("/store-status", getStoreStatus);

module.exports = router;
