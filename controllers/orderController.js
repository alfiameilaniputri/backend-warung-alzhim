const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");
const midtransClient = require("midtrans-client");
const Review = require("../models/Review");

// 🔹 MIDTRANS CONFIG
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// 🔹 CREATE ORDER (Buyer Checkout)
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const buyerId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item.",
      });
    }

    // Create empty order
    const order = await Order.create({
      buyer: buyerId,
      items: [],
      totalPrice: 0,
      status: "pending",
    });

    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found.`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}.`,
        });
      }

      const subtotal = product.price * item.quantity;
      totalPrice += subtotal;

      product.stock -= item.quantity;
      await product.save();

      const orderItem = await OrderItem.create({
        order: order._id,
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        subtotal,
      });

      orderItems.push(orderItem);
    }

    order.items = orderItems.map((i) => i._id);
    order.totalPrice = totalPrice;
    await order.save();

    // Midtrans
    const parameter = {
      transaction_details: {
        order_id: order._id.toString(),
        gross_amount: totalPrice,
      },
      credit_card: { secure: true },
      customer_details: { user_id: buyerId },
    };

    const transaction = await snap.createTransaction(parameter);

    order.snapToken = transaction.token;
    order.redirectUrl = transaction.redirect_url;
    await order.save();

    // ===============================
    // CREATE NOTIFICATIONS
    // ===============================

    const buyer = await User.findById(buyerId);

    // Notification to User
    await Notification.create({
      user: buyerId,
      title: "Order Berhasil Dibuat",
      message: `Pesanan Anda berhasil dibuat. Silakan lanjutkan pembayaran.`,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully. Notifications sent.",
      data: {
        orderId: order._id,
        totalPrice,
        status: order.status,
        payment: {
          snapToken: transaction.token,
          redirectUrl: transaction.redirect_url,
        },
        items: orderItems,
      },
    });

  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating order.",
      error: error.message,
    });
  }
};


// 🔹 HANDLE MIDTRANS NOTIFICATION
exports.paymentOrder = async (req, res) => {
  try {
    const notification = req.body;
    const orderId = notification.order_id;

    const order = await Order.findById(orderId).populate("buyer");
    if (!order) return res.status(404).json({ msg: "Order not found" });

    let newStatus = order.status;
    const transactionStatus = notification.transaction_status;

    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      newStatus = "paid";
      order.snapToken = null;
      order.redirectUrl = null;

      // ============================
      // CREATE NOTIFICATION EVENT
      // ============================

      // Notif to User
      await Notification.create({
        user: order.buyer._id,
        title: "Pembayaran Berhasil",
        message: `Pembayaran untuk pesanan dengan ID ${order._id} telah berhasil. Pesanan Anda akan segera diproses.`,
      });

      // Notif to Admin
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: "Pesanan Sudah Dibayar",
          message: `Pesanan dari ${order.buyer.name} dengan ID ${order._id} sudah dibayar. Segera proses pengantaran.`,
        });
      }
    } else if (transactionStatus === "cancel") {
      newStatus = "cancelled";
    } else if (transactionStatus === "expire") {
      newStatus = "failed";
    }

    order.status = newStatus;
    await order.save();

    res.status(200).json({
      msg: "Midtrans notification processed successfully",
      orderId,
      newStatus,
    });
  } catch (err) {
    console.error("Payment Order Error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// 🔹 GET USER ORDERS
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate({
        path: "items",
        populate: { path: "product", select: "name price images" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "User orders retrieved successfully.",
      meta: {
        totalOrders: orders.length,
      },
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching user orders.",
      error: error.message,
    });
  }
};

// 🔹 GET USER ORDER BY ID
exports.getDetailUserOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    let order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
    })
      .populate({
        path: "items",
        populate: { path: "product", select: "name price images description" },
      })
      .populate("buyer", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or you do not have access to this resource.",
      });
    }

    // --- Tambahkan review ke setiap item secara manual ---
    const itemsWithReview = await Promise.all(
      order.items.map(async (item) => {
        const review = await Review.findOne({
          order: orderId,
          product: item.product._id,
          buyer: req.user.id,
        }).select("rating comment createdAt");

        return {
          ...item.toObject(),
          review: review || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Order details retrieved successfully.",
      data: {
        ...order.toObject(),
        items: itemsWithReview,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching order details.",
      error: error.message,
    });
  }
};

// 🔹 CONFIRM ORDER RECEIVED (Buyer)
exports.confirmOrderCompleted = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Find order
    const order = await Order.findById(orderId).populate("buyer", "name");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Validate owner
    if (order.buyer._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm this order.",
      });
    }

    // Validate status
    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be confirmed until it has been delivered.",
      });
    }

    // Update status to completed
    order.status = "completed";
    await order.save();

    // Update order items to confirmed
    const result = await OrderItem.updateMany(
      { order: orderId },
      { $set: { isConfirmed: true } }
    );

    // 🔍 Ambil admin users
    const admins = await User.find({ role: "admin" });

    // 🔔 Send notification to all admins
    for (const admin of admins) {
      await Notification.create({
        user: admin._id, 
        title: "Order Completed",
        message: `Buyer ${order.buyer.name} confirmed order #${order._id} as completed.`,
        type: "order_completed",
        isRead: false,
        relatedOrder: order._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order successfully confirmed as completed & notification sent to admin.",
      meta: {
        updatedItems: result.modifiedCount,
      },
      data: {
        orderId: order._id,
        status: order.status,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while confirming the order.",
      error: error.message,
    });
  }
};