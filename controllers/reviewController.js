const Review = require("../models/Review");
const Order = require("../models/Order");
const Item = require("../models/OrderItem");
const Product = require("../models/Product");

exports.createReview = async (req, res) => {
  try {
    const { orderItemId, rating, comment } = req.body;
    const buyer = req.user?._id;

    // Validasi input dasar
    if (!orderItemId || !rating) {
      return res.status(400).json({
        success: false,
        message: "OrderItem ID dan rating wajib diisi.",
      });
    }

    // Cari order item berdasarkan ID
    const item = await Item.findOne({ _id: orderItemId })
      .populate("order")
      .populate("product");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Order item tidak ditemukan.",
      });
    }

   // Validasi kepemilikan (user hanya boleh review pesanannya sendiri)
    if (item.order.buyer.toString() !== buyer.toString()) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak berhak mereview order item ini.",
      });
    }

    // Validasi penerimaan barang
    if (!item.isConfirmed) {
      return res.status(400).json({
        success: false,
        message: "Konfirmasi penerimaan barang terlebih dahulu sebelum memberikan review.",
      });
    }

    // Cek apakah sudah pernah review
    if (item.isReviewed) {
      return res.status(400).json({
        success: false,
        message: "Produk ini sudah direview sebelumnya.",
      });
    }

    // Buat review baru
    const review = await Review.create({
      order: item.order._id,
      product: item.product._id,
      buyer,
      rating,
      comment,
    });

    // Update flag reviewed
    item.isReviewed = true;
    await item.save();

    return res.status(201).json({
      success: true,
      message: "Review berhasil dikirim.",
      data: review,
    });

  } catch (error) {
    console.error("Error saat membuat review:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses review.",
      error: error.message,
    });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .populate("buyer", "name")  // Tampilkan nama user yang memberi review
      .sort({ createdAt: -1 });  // Urutkan dari review terbaru

    res.status(200).json({ msg: "Reviews fetched", reviews });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};