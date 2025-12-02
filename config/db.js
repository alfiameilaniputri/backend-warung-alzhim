// config/db.js
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const URI = process.env.MONGODB_URI; // harus sesuai .env
  if (!URI) {
    console.error("❌ MONGODB_URI tidak ditemukan di .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected...");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
