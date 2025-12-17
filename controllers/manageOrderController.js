const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");
const Notification = require("../models/Notification");

// 🔹 UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatus = [
      "pending",
      "paid",
      "cancelled",
      "failed",
      "completed",
      "delivered",
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Please use a valid order status.",
        validStatus,
      });
    }

    const order = await Order.findById(orderId).populate("buyer", "name email");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Update status & deliveredAt
    order.status = status;
    if (status === "delivered") {
      order.deliveredAt = new Date(); // set waktu pengiriman
    }
    await order.save();

    // 🔔 Notifikasi ketika dikirim
    if (status === "delivered") {
      await Notification.create({
        user: order.buyer._id,
        title: "Pesanan Anda Sedang Dikirim 🚚",
        message: `Pesanan #${order._id} sedang dalam perjalanan. Pesanan akan otomatis selesai jika tidak dikonfirmasi dalam 24 jam.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      data: order,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the order status.",
      error: error.message,
    });
  }
};

exports.createOfflineOrder = async (req, res) => {
  try {
    const admin = req.user;
    const { items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ msg: "Items are required" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ msg: "Payment method is required" });
    }

    // Buat order utama
    const offlineOrder = await Order.create({
      orderType: "offline",
      paymentMethod,
      buyer: admin._id,
      createdBy: admin._id,
      totalPrice: 0,
      status:"completed",
      items: []
    });

    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ msg: `Product not found: ${item.productId}` });

      const qty = item.qty || item.quantity;
      const subtotal = product.price * qty;

      if (product.stock < qty) {
        return res.status(400).json({ msg: `Insufficient stock for ${product.name}` });
      }

      product.stock -= qty;
      await product.save();

      const orderItem = await OrderItem.create({
        order: offlineOrder._id,
        product: product._id,
        quantity: qty,
        price: product.price,
        subtotal
      });

      offlineOrder.items.push(orderItem._id);
      totalAmount += subtotal;
    }

    offlineOrder.totalPrice = totalAmount;
    await offlineOrder.save();

    res.status(201).json({
      msg: "Offline order saved successfully",
      data: offlineOrder,
    });

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// 🔹 GET ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const onlineOrders = await Order.find({ orderType: "online" })
      .populate("buyer", "name email")
      .populate("createdBy", "name email") // optional, online biasanya null
      .populate({
        path: "items",
        populate: {
          path: "product",
          select: "name description images price",
        },
      })
      .sort({ createdAt: -1 });

    const offlineOrders = await Order.find({ orderType: "offline" })
      .populate("buyer", "name email") // optional, order offline mungkin tidak ada buyer
      .populate("createdBy", "name email")
      .populate({
        path: "items",
        populate: {
          path: "product",
          select: "name description images price",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: {
        onlineOrders,
        offlineOrders,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: error.message });
  }
};

exports.getDetailOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate({
        path: "buyer",
        select: "name email"
      })
      .populate({
        path: "items",
        populate: {
          path: "product",
          select: "name description images price"
        }
      })
      .sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Order detail fetched successfully",
      data: order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order detail",
      error: error.message
    });
  }
};

// 🔹 ONLY ONLINE ORDERS
exports.getOnlineOrders = async (req, res) => {
  try {
    const onlineOrders = await Order.find({ orderType: "online" })
      .populate("buyer", "name email")
      .populate({
        path: "items",
        populate: { path: "product", select: "name description images price" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ msg: "Online orders fetched", data: onlineOrders });

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// 🔹 ONLY OFFLINE ORDERS
exports.getOfflineOrders = async (req, res) => {
  try {
    const offlineOrders = await Order.find({ orderType: "offline" })
      .populate("buyer createdBy", "name email")
      .populate({
        path: "items",
        populate: { path: "product", select: "name description images price" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ msg: "Offline orders fetched", data: offlineOrders });

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.getDailyStats = async (req, res) => {
  try {
    // Awal hari (WIB)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfDayUTC = new Date(startOfDay.getTime() - (7 * 60 * 60 * 1000));

    // Total order online dan offline
    const totalOnlineOrders = await Order.countDocuments({
      orderType: "online",
      updatedAt: { $gte: startOfDayUTC },
    });

    const totalOfflineOrders = await Order.countDocuments({
      orderType: "offline",
      updatedAt: { $gte: startOfDayUTC },
    });

    // Revenue online (status completed saja)
    const completedOnlineOrders = await Order.find({
      orderType: "online",
      status: "completed",
      updatedAt: { $gte: startOfDayUTC },
    });

    const onlineRevenue = completedOnlineOrders.reduce(
      (sum, order) => sum + (order.totalPrice || 0),
      0
    );

    // Revenue offline ambil dari `amount`
    const completedOfflineOrders = await Order.find({
      orderType: "offline",
      updatedAt: { $gte: startOfDayUTC },
    });

    const offlineRevenue = completedOfflineOrders.reduce(
      (sum, order) => sum + (order.totalPrice || 0),
      0
    );

    const totalRevenue = onlineRevenue + offlineRevenue;

    res.status(200).json({
      success: true,
      message: "Daily stats fetched successfully",
      date: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      stats: {
        totalOnlineOrders,
        totalOfflineOrders,
        onlineRevenue,
        offlineRevenue,
        totalRevenue,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: error.message });
  }
};
