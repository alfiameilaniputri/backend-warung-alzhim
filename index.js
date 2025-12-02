const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// auto completed order after 24 jam
require("./cron/autoCompleteOrder");

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors()); // 🔥 enable CORS untuk semua origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static("public"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/order", require("./routes/orderRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/review", require("./routes/reviewRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Error handling middleware (opsional, biar rapi kalau error)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
