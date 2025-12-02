const express = require("express");
const router = express.Router();
const {
  createCategory,
  getCategories,
  getDetailCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Admin only
router.post("/", protect, adminOnly, createCategory);
router.put("/:id", protect, adminOnly, updateCategory);
router.delete("/:id", protect, adminOnly, deleteCategory);

// Public
router.get("/", getCategories);
router.get("/:id", getDetailCategory);

module.exports = router;
