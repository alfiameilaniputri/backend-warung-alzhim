const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createReview,
  getProductReviews,
} = require("../controllers/reviewController");

router.post("/", protect, createReview);
router.get("/:productId", getProductReviews);

module.exports = router;
