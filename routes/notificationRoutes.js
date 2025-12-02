const express = require("express");
const {getNotifications, readNotification} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware"); // import middleware auth

const router = express.Router();

router.get("/", protect, getNotifications);
router.post("/read/:id", protect, readNotification);

module.exports = router;
