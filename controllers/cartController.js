const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.addCartItem = async (req, res) => {
  try {
    const userId = req.user._id; // Ambil ID user dari token login
    const { productId, qty } = req.body; //Ambil ID produk dan jumlah dari input user

    // Validasi input (productId & qty wajib diisi)
    if (!productId || !qty) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required.",
      });
    }

    // Cek apakah produk ada di database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    
    // Cek apakah produk sudah pernah ditambahkan ke keranjang
    const existingItem = await Cart.findOne({ userId, productId });

     // Jika sudah ada, tambahkan quantity-nya
    if (existingItem) {
      existingItem.qty += qty;
      await existingItem.save();

      return res.status(200).json({
        success: true,
        message: "Cart item quantity updated.",
        data: existingItem,
      });
    }

    //jika belum ada, buat item baru di cart
    const newItem = await Cart.create({ userId, productId, qty });

    return res.status(201).json({
      success: true,
      message: "Product added to cart successfully.",
      data: newItem,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart.",
      error: error.message,
    });
  }
};

exports.getCartItems = async (req, res) => {
  try {
    const userId = req.user._id; // ambil id user dari token login

    // Ambil semua item di cart milik user dan tampilkan detail produk + kategori
    const items = await Cart.find({ userId })
      .populate({
        path: "productId",
        populate: { path: "category", select: "name" } // ambil nama kategori
      });

    // Hitung total price per item + total keseluruhan
    const dataWithTotals = items.map(item => {
      const itemTotal = item.productId.price * item.qty;
      return {
        ...item._doc,
        itemTotal,
      };
    });

    
    // Hitung total keseluruhan keranjang
    const grandTotal = dataWithTotals.reduce((sum, item) => sum + item.itemTotal, 0);

    return res.status(200).json({
      success: true,
      message: "Cart items retrieved successfully.",
      totalItems: items.length,
      grandTotal, // total semua harga barang di keranjang
      data: dataWithTotals,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cart items.",
      error: error.message,
    });
  }
};


exports.updateCartItemQty = async (req, res) => {
  try {
    const { qty } = req.body; // Ambil jumlah baru
    const { id } = req.params; // Ambil ID item dari parameter URL

    // Cek apakah item keranjang ada
    const item = await Cart.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    // Jika jumlah <= 0, hapus item dari keranjang
    if (qty <= 0) {
      await item.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Item removed because quantity is zero.",
      });
    }

    // Update jumlah barang
    item.qty = qty;
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated successfully.",
      data: item,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update quantity.",
      error: error.message,
    });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { id } = req.params; //Ambil ID item dari parameter

     // Cek apakah item ada di keranjang
    const item = await Cart.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    // Hapus item dari db
    await item.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Cart item removed successfully.",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove cart item.",
      error: error.message,
    });
  }
};