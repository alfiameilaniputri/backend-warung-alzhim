const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const Order = require("../models/Order");

// REGISTER
exports.register = async (req, res) => {
  try {
    // ambil input data user
    const { name, email, password, username, phone_number, address } = req.body;

    // Cek apakah semua field terisi
    if (
      !name ||
      !email ||
      !password ||
      !username ||
      !phone_number ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: {
          fields: "Semua field wajib diisi!",
        },
      });
    }

    // Validasi panjang password minimal 8 karakter
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: {
          password: "Password minimal harus 8 karakter!",
        },
      });
    }

    // Validasi email sudah ada atau belum
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(409).json({
        success: false,
        status_code: 409,
        message: "Email sudah digunakan",
        errors: {
          email: "Email already exists",
        },
      });
    }

    // hash atau enkripsi password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    // simpan data user baru ke database
    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      phone_number,
      address,
      role: "user",
    });

    // kirim respons sukses : pesan berhasil register
    res.status(201).json({
      success: true,
      status_code: 201,
      message: "User registered successfully",
      data: {
        user: {
          name,
          email,
          username,
          phone_number,
          address,
        },
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: err.message,
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input kosong
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { fields: "Email dan password wajib diisi" },
      });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "Pengguna tidak ditemukan",
        errors: { email: "Email tidak terdaftar" },
      });
    }

    // Cek status warung (hanya untuk user biasa bukan admin)
    if (user.role !== "admin") {
      const storeStatus = await User.findOne({ role: "admin" });

      if (!storeStatus || storeStatus.isActive !== true) {
        return res.status(403).json({
          success: false,
          status_code: 403,
          message: "Warung sedang tidak aktif",
          errors: {
            store: "Silakan coba lagi nanti",
          },
        });
      }
    }

    // Cek password yang diinput = password yang di-hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        status_code: 401,
        message: "Kredensial tidak valid",
        errors: { password: "Kata Sandi salah" },
      });
    }

    // Generate token (buat token login JWT)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // kirim Respons sukses
    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: err.message,
    });
  }
};

//LUPA PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    //validasi input email
    if (!email) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { email: "Email wajib diisi" },
      });
    }

    //cari user berdasarkan email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "Pengguna tidak ditemukan",
        errors: { email: "Email tidak terdaftar" },
      });
    }

    // Generate (buat) token reset password (expired 15 menit)
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // Link reset password
    const resetLink = `https://warung-alzhim.vercel.app/reset-password/${resetToken}`;

    // Membuat koneksi pengirim email dengan Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail", // layanan email yang digunakan
      auth: {
        user: process.env.EMAIL_USER, // ambil email dari .env
        pass: process.env.EMAIL_PASS, // ambil password dari .env
      },
    });

    // Kirim email ke user berisi link reset password
    await transporter.sendMail({
      from: "Your App",
      to: email,
      subject: "Reset Password",
      html: `
        <p>Klik link berikut untuk reset password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Link berlaku selama 15 menit.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Reset password link telah dikirim ke email Anda",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: err.message,
    });
  }
};

//RESET PASSWORD
//Verifikasi token reset dan perbarui password pengguna
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { password: "Password baru wajib diisi" },
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { password: "Password minimal 8 karakter" },
      });
    }

    // Verify token JWT dari link
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil user berdasarkan decoded.id (token)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "User tidak ditemukan",
      });
    }

    // Encrypt password baru
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Password berhasil diperbarui",
    });
  } catch (err) {
    console.error(err);

    let errorMessage = err.message;

    if (err.name === "TokenExpiredError") {
      errorMessage = "Token reset password sudah kadaluarsa";
    }

    return res.status(400).json({
      success: false,
      status_code: 400,
      message: "Invalid or expired token",
      error: errorMessage,
    });
  }
};

// GET PROFILE USER BY TOKEN
// Mengambil data profil user dari token login
exports.getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Token tidak ditemukan" });
    }

    // Verifikasi token JWT
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil data user tanpa password
    const user = await User.findById(decoded.id)
      .select("-password")
      .populate("address"); // hanya populate address

    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ msg: "Token tidak valid atau sudah kadaluarsa" });
  }
};

const fs = require("fs");     // Modul bawaan Node.js untuk membaca, menulis, dan menghapus file
const path = require("path"); // Modul untuk mengatur dan menggabungkan path folder atau file
const sharp = require("sharp"); // Library untuk mengedit atau memperkecil ukuran gambar (resize foto profil)

exports.updateProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    // Cek apakah token dikirim melalui header
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        status_code: 401,
        message: "Token tidak ditemukan",
      });
    }

    const token = authHeader.split(" ")[1];  // Ambil token dari header
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verifikasi token JWT

    // Ambil data dari body request
    const { name, username, phone_number, address, oldPassword, newPassword } =
      req.body;

    // Cari user berdasarkan ID hasil decode token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "User tidak ditemukan",
      });
    }

    // Update password jika dikirim
    if (newPassword) {
      if (!oldPassword) {
        return res
          .status(400)
          .json({ success: false, message: "Old password diperlukan" });
      }

      //Bandingkan password lama dengan yang tersimpan di db
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res
          .status(400)
          .json({ success: false, message: "Old password salah" });
      }

      //validasi panjang pw baru
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ success: false, message: "Password minimal 8 karakter" });
      }

      //simpan pw baru setelah di hash
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // ====== UPDATE PROFILE IMAGE ======
    if (req.file) {
      const uploadPath = path.join(__dirname, "../public/user_profile"); //tentukan folder penyimpanan foto

      // Hapus file lama jika ada
      if (user.profileImage) {
        const oldPath = path.join(uploadPath, user.profileImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      // Ambil ekstensi dari file asli
      const ext = path.extname(req.file.originalname).toLowerCase(); // .jpg, .png, dll

      // Buat nama file baru agar unik
      const newFilename = `profile_${user.username}_${Date.now()}${ext}`;

      // Simpan file yang sudah diresize
      await sharp(req.file.buffer)
        .resize(400, 400, { fit: "cover" })
        .toFormat(ext === ".png" ? "png" : "jpeg", { quality: 90 })
        .toFile(path.join(uploadPath, newFilename));

      // Simpan nama file ke DB
      user.profileImage = newFilename;
    }

    // Update data profil lain
    user.name = name || user.name;
    user.username = username || user.username;
    user.phone_number = phone_number || user.phone_number;
    user.address = address || user.address;

    await user.save(); //simpan semua perubahan ke db

    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          address: user.address,
          profileImage: user.profileImage,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//Update status warung
exports.updateActiveStatus = async (req, res) => {
  try {
    const { isActive } = req.body; //Ambil status baru (true / false)
    const userId = req.user.id;  //Dapat dari middleware JWT

    //Validasi nilai harus boolean
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive harus berupa boolean (true / false)",
      });
    }

    //Cek jika warung ingin dinonaktifkan, pastikan tidak ada pesanan aktif
    if (!isActive) {
      const hasUndeliveredOrders = await Order.exists({
        status: { $in: ["paid", "delivered"] },
      });

      //Jika masih ada pesanan, tolak perubahan status
      if (hasUndeliveredOrders) {
        return res.status(403).json({
          success: false,
          status_code: 403,
          message: "Tidak dapat menonaktifkan toko",
          errors: {
            order: "Masih ada pesanan yang belum dikirim",
          },
        });
      }
    }

    // Cari user yang ingin diubah statusny
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Status warung berhasil diubah menjadi ${
        isActive ? "Aktif" : "Non-Aktif"
      }`,
      data: {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Mengecek status aktif/nonaktif toko dari akun admin
exports.getStoreStatus = async (req, res) => {
  try {
    //Cari user dengan role admin
    const admin = await User.findOne({ role: "admin" });

    //Jika tidak ada admin ditemukan
    if (!admin) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "Admin tidak ditemukan",
      });
    }

    //Kirim respon status aktif warung
    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Berhasil mengambil status aktif warung",
      data: {
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};
