const express = require("express");
const {
  addCartItem,
  getCartItems,
  updateCartItemQty,
  removeCartItem,
} = require("../controllers/cartController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, addCartItem);
router.get("/", protect, getCartItems);
router.put("/:id", protect, updateCartItemQty);
router.delete("/:id", protect, removeCartItem);

module.exports = router;
