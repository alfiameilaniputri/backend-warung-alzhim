const Category = require("../models/Category");

// Create
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body; // Ambil nama dan deskripsi kategori dari input use

    // Cek apakah kategori dengan nama yang sama sudah ada
    const exist = await Category.findOne({ name });
    if (exist) return res.status(400).json({ msg: "Category already exists" });

    // Jika belum ada, buat kategori baru dan simpan ke database
    const category = await Category.create({ name, description });

    //kiirm response sukses ke client
    res.status(201).json({ msg: "Category created", category });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get all
exports.getCategories = async (req, res) => {
  try {
    // Ambil semua data kategori dari database
    const categories = await Category.find();

     // Kirim semua kategori dalam bentuk JSON
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get by id
exports.getDetailCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ msg: "Category not found" });
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Update
exports.updateCategory = async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ msg: "Category not found" });
    res.status(200).json({ msg: "Category updated", category: updated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Delete
exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: "Category not found" });
    res.status(200).json({ msg: "Category deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
