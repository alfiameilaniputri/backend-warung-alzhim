// seederCategory.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Category = require("./models/Category");

dotenv.config();

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected...");

    // Hapus semua data kategori dulu
    await Category.deleteMany();

    const categories = [
      { name: "Elektronik", description: "Barang-barang elektronik bekas" },
      { name: "Pakaian", description: "Baju, celana, dan fashion bekas" },
      { name: "Buku", description: "Buku pelajaran, novel, komik bekas" },
      { name: "Perabotan", description: "Furniture dan peralatan rumah tangga" },
      { name: "Mainan", description: "Mainan anak-anak bekas" },
      { name: "Olahraga", description: "Peralatan olahraga bekas" },
    ];

    await Category.insertMany(categories);
    console.log("✅ Dummy categories seeded!");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedCategories();
