const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const {
  createOrder,
  paymentOrder,
  confirmOrderCompleted,
  getUserOrders,
  getDetailUserOrder,
} = require("../controllers/orderController");

const {
  updateOrderStatus,
  getDetailOrder,
  createOfflineOrder,
  getAllOrders,
  getOnlineOrders,
  getOfflineOrders,
  getDailyStats,
} = require("../controllers/manageOrderController");

const router = express.Router();

// ======= USER ROUTES =======
router.post("/", protect, createOrder);
router.post("/payment", paymentOrder);
router.patch("/confirm/:orderId", protect, confirmOrderCompleted);
router.get("/", protect, getUserOrders);

// ======= ADMIN ROUTES =======
router.post("/offline", protect, adminOnly, createOfflineOrder);
router.get("/history", protect, adminOnly, getAllOrders);
router.get("/online-history", protect, adminOnly, getOnlineOrders);
router.get("/offline-history", protect, adminOnly, getOfflineOrders);
router.get("/stats", protect, adminOnly, getDailyStats);

router.patch("/status/:orderId", protect, adminOnly, updateOrderStatus);
router.get("/detail/:orderId", protect, adminOnly, getDetailOrder);

// ======= PARAM ROUTE PALING TERAKHIR =======
router.get("/:orderId", protect, getDetailUserOrder);

module.exports = router;
