// models/Address.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String, required: true },
  region: { type: String },
  postalCode: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Address", addressSchema);
