const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.addCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, qty } = req.body;

    if (!productId || !qty) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const existingItem = await Cart.findOne({ userId, productId });

    if (existingItem) {
      existingItem.qty += qty;
      await existingItem.save();

      return res.status(200).json({
        success: true,
        message: "Cart item quantity updated.",
        data: existingItem,
      });
    }

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
    const userId = req.user._id;

    const items = await Cart.find({ userId })
      .populate({
        path: "productId",
        populate: { path: "category", select: "name" }
      });

    // Hitung total price per item + total keseluruhan
    const dataWithTotals = items.map(item => {
      const itemTotal = item.productId.price * item.qty;
      return {
        ...item._doc,
        itemTotal,
      };
    });

    const grandTotal = dataWithTotals.reduce((sum, item) => sum + item.itemTotal, 0);

    return res.status(200).json({
      success: true,
      message: "Cart items retrieved successfully.",
      totalItems: items.length,
      grandTotal,
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
    const { qty } = req.body;
    const { id } = req.params;

    const item = await Cart.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    if (qty <= 0) {
      await item.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Item removed because quantity is zero.",
      });
    }

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
    const { id } = req.params;

    const item = await Cart.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

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