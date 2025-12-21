const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");
const midtransClient = require("midtrans-client");
const Review = require("../models/Review");

// 🔹 MIDTRANS CONFIG
const snap = new midtransClient.Snap({
  isProduction: false, // false = sandbox mode (pengujian)
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// 🔹 CREATE ORDER (Buyer Checkout)
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body; //ambil item pesanan dari body
    const buyerId = req.user.id; // ambil id user/pembeli dari token login

    // Cek apakah admin(penjual) aktif
    const admin = await User.findOne({ role: "admin" });

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Tidak dapat melanjutkan order. Admin tidak ditemukan.",
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Tidak dapat melanjutkan order. Admin sedang tidak aktif.",
      });
    }

    //cek data pembeli
    const buyer = await User.findById(buyerId);

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // CEK DATA PENGIRIMAN
    if (
      !buyer.name ||
      buyer.name.trim() === "" ||
      !buyer.phone_number ||
      buyer.phone_number.trim() === "" ||
      !buyer.address ||
      buyer.address.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Data pengiriman wajib diisi",
      });
    }

    // Validasi minimal ada satu item
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item.",
      });
    }

    // Buat order kosong
    const order = await Order.create({
      buyer: buyerId,
      items: [],
      totalPrice: 0,
      status: "pending",
    });

    let totalPrice = 0;
    const orderItems = [];

     // Loop setiap produk untuk menghitung subtotal dan mengurangi stok
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

      product.stock -= item.quantity; // kurangi stok
      await product.save();

      // Simpan item ke tabel OrderItem
      const orderItem = await OrderItem.create({
        order: order._id,
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        subtotal,
      });

      orderItems.push(orderItem);
    }

    // Update total dan item order utama
    order.items = orderItems.map((i) => i._id);
    order.totalPrice = totalPrice;
    await order.save();

    // Buat transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: order._id.toString(),
        gross_amount: totalPrice,
      },
      credit_card: { secure: true },
      customer_details: { user_id: buyerId },

      // ⏰ Tambahkan custom durasi midtrans
      custom_expiry: {
        order_time: new Date().toISOString(),
        expiry_duration: 1,
        unit: "hour", 
      },
    };

    const transaction = await snap.createTransaction(parameter); // Kirim request ke Midtrans

    // Simpan token dan redirect URL dari Midtrans
    order.snapToken = transaction.token;
    order.redirectUrl = transaction.redirect_url;
    await order.save();

    // Kirim Notification to User(pembeli)
    await Notification.create({
      user: buyerId,
      title: "Order Berhasil Dibuat",
      message: `Pesanan Anda berhasil dibuat. Silakan lanjutkan pembayaran.`,
    });

    //kirim response sukses
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
    const notification = req.body; // Data notifikasi dari Midtrans
    const orderId = notification.order_id;

    const order = await Order.findById(orderId).populate("buyer");
    if (!order) return res.status(404).json({ msg: "Order not found" });

    const transactionStatus = notification.transaction_status;
    const paymentType = notification.payment_type;

    // Tentukan metode pembayaran sesuai data Midtrans
    let paymentMethod = "Midtrans";

    if (
      paymentType === "bank_transfer" &&
      notification.va_numbers?.length > 0
    ) {
      paymentMethod = notification.va_numbers[0].bank.toUpperCase(); // BCA, BNI, BRI, MANDIRI
    } else if (paymentType === "cstore") {
      paymentMethod = notification.store?.toUpperCase() || "CSTORE"; // ALFAMART / INDOMARET
    } else if (paymentType === "qris") {
      paymentMethod = "QRIS";
    } else if (paymentType === "gopay") {
      paymentMethod = "GOPAY";
    } else if (paymentType === "shopeepay") {
      paymentMethod = "SHOPEEPAY";
    } else if (paymentType === "echannel") {
      paymentMethod = "MANDIRI BILL";
    }

    let newStatus = order.status;

    //Update status sesuai hasil tarnsaksi
    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      newStatus = "paid";
      order.snapToken = null;
      order.redirectUrl = null;
      order.paymentMethod = paymentMethod;

      //Buat notif untu user/pembeliu
      await Notification.create({
        user: order.buyer._id,
        title: "Pembayaran Berhasil",
        message: `Pembayaran untuk pesanan dengan ID ${order.orderId} telah berhasil menggunakan metode ${paymentMethod}. Pesanan Anda akan segera diproses.`,
      });

      //kirim notifikasi ke admin
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: "Pesanan Sudah Dibayar",
          message: `Pesanan dari ${order.buyer.name} dengan ID ${order.orderId} sudah dibayar melalui ${paymentMethod}. Segera proses pengantaran.`,
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
      paymentMethod,
    });
  } catch (err) {
    console.error("Payment Order Error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// 🔹 GET SEMUA PESANA USER(PEMBELI)
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

// 🔹 GET DETAIL USER ORDER BY ID (with reviews)
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
      .populate("buyer", "name email phone address"); // ← Ubah ini, tambah phone dan address

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or you do not have access to this resource.",
      });
    }

    // Tambahkan data review pada setiap item
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
          isReviewed: !!review,
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

// KONFIRMASI PESANAN SELESAI (COMPLETED)
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

     // Pastikan user yang konfirmasi adalah pembelinya
    if (order.buyer._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm this order.",
      });
    }

     // Cek status pesanan sudah dikirim atau belum
    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be confirmed until it has been delivered.",
      });
    }

    // Update status jadi completed
    order.status = "completed";
    await order.save();

    // Tandai item order sebagai dikonfirmasi
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
        message: `Buyer ${order.buyer.name} confirmed order #${order.orderId} as completed.`,
        type: "order_completed",
        isRead: false,
        relatedOrder: order._id,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Order successfully confirmed as completed & notification sent to admin.",
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
