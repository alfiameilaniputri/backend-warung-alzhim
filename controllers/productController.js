const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category")

exports.createProduct = async (req, res) => {
  try {
    const { name, description, condition, category, price, stock } = req.body;

    // Validate required fields
    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: "Name, category, and price are required",
      });
    }

    // Process images (if exists)
    const images = req.files?.map((file) => `${file.filename}`) || [];

    const newProduct = await Product.create({
      name,
      description,
      condition,
      category,
      images,
      price: Number(price),
      stock: Number(stock) || 0
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });

  } catch (error) {
    console.error("Create Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      count: products.length,
      data: products,
    });

  } catch (error) {
    console.error("Get All Products Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getDetailProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id).populate("category", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });

  } catch (error) {
    console.error("Get Detail Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { keyword = "", page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const products = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $match: {
          $or: [
            { name: { $regex: keyword, $options: "i" } },
            { "category.name": { $regex: keyword, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          name: 1,
          images: 1,
          price: 1,
          stock: 1,
          description: 1,
          "category._id": 1,
          "category.name": 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
    ]);

    const totalData = await Product.countDocuments({
      name: { $regex: keyword, $options: "i" },
    });

    return res.status(200).json({
      success: true,
      message: "Search results retrieved successfully",
      pagination: {
        currentPage: Number(page),
        limit: Number(limit),
        totalProducts: totalData,
        totalPages: Math.ceil(totalData / limit),
      },
      data: products,
    });

  } catch (error) {
    console.error("Search Products Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, condition, category, price, stock } = req.body;

    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Data yang diupdate
    const updateData = { name, description, condition, category, price, stock };

    // Jika ada gambar baru => hapus gambar lama & set gambar baru
    if (req.files && req.files.length > 0) {

      // Hapus file lama di folder
      product.images.forEach(img => {
        const filePath = path.join(__dirname, `../public/products/${img}`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      // Set gambar baru
      updateData.images = req.files.map(file => file.filename);
    }

    // Update data
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });

  } catch (error) {
    console.error("Update Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah produk ada
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Hapus gambar dari folder
    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        const filePath = path.join(__dirname, `../public/products/${img}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Hapus dari database
    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};