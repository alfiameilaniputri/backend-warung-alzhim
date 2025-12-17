const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // ⭐ CUSTOM ORDER ID
    orderId: {
      type: String,
      unique: true,
    },

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

// ⭐ GENERATE CUSTOM ORDER ID SEBELUM SAVE
orderSchema.pre("save", async function (next) {
  if (!this.orderId && this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    // Hitung jumlah order hari ini
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));

    const count = await mongoose.model("Order").countDocuments({
      createdAt: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });

    // Format: ONL-20241204-001 atau OFF-20241204-001
    const prefix = this.orderType === "online" ? "ONL" : "OFF";
    this.orderId = `${prefix}-${dateStr}-${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);