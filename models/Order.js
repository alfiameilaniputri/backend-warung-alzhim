const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // online/offline order
    orderType: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },

    // pembeli (customer)
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // jika offline, admin yang membuat order
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderItem",
        required: true,
      },
    ],

    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price must be positive"],
    },

    // method pembayaran
    paymentMethod: {
      type: String,
      enum: ["midtrans", "cash", "transfer", "qris"],
      default: "midtrans",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "cancelled",
        "failed",
        "delivered",
        "completed",
      ],
      default: "pending",
    },

    snapToken: { type: String, default: null },
    redirectUrl: { type: String, default: null },

    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
