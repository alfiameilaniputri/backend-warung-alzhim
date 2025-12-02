const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// REGISTER
exports.register = async (req, res) => {
  try {
    // ambil input data user
    const {
      name, email, password, username, phone_number, address
    } = req.body;

    // Cek apakah semua field terisi
    if (!name || !email || !password || !username || !phone_number || !address) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: {
          fields: "Semua field wajib diisi!"
        }
      });
    }

    // Validasi panjang password minimal 8 karakter
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: {
          password: "Password minimal harus 8 karakter!"
        }
      });
    }

    // Validasi email sudah ada atau belum
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(409).json({
        success: false,
        status_code: 409,
        message: "Conflict",
        errors: {
          email: "Email already exists"
        }
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // simpan data ke database
    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      phone_number,
      address,
      role: "user",
    });

    // pesan berhasil register
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
          address
        }
      }
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: err.message
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
        errors: {
          fields: "Email dan password wajib diisi"
        }
      });
    }

    // Cari user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "User not found",
        errors: {
          email: "Email tidak terdaftar"
        }
      });
    }

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        status_code: 401,
        message: "Invalid credentials",
        errors: {
          password: "Password salah"
        }
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Respons sukses profesional
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
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: err.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { email: "Email wajib diisi" }
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "User not found",
        errors: { email: "Email tidak terdaftar" }
      });
    }

    // Generate token reset password (expired 15 menit)
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Link reset password
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Kirim email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: "Your App",
      to: email,
      subject: "Reset Password",
      html: `
        <p>Klik link berikut untuk reset password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Link berlaku selama 15 menit.</p>
      `
    });

    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Reset password link telah dikirim ke email Anda"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: err.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { password: "Password baru wajib diisi" }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        message: "Validation error",
        errors: { password: "Password minimal 8 karakter" }
      });
    }

    // Verify token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil user berdasarkan decoded.id
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "User tidak ditemukan"
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
      message: "Password berhasil diperbarui"
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
      error: errorMessage
    });
  }
};

// GET USER BY TOKEN
exports.getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('address'); // hanya populate address

    if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });

    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ msg: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        status_code: 401,
        message: "Token tidak ditemukan"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, username, phone_number, address, oldPassword, newPassword } = req.body;

    // Cari user berdasarkan token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status_code: 404,
        message: "User tidak ditemukan"
      });
    }

    // Jika ingin update password juga
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({
          success: false,
          message: "Old password diperlukan untuk mengubah password"
        });
      }

      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Old password salah"
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password minimal 8 karakter"
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update field lain
    user.name = name || user.name;
    user.username = username || user.username;
    user.phone_number = phone_number || user.phone_number;
    user.address = address || user.address;

    await user.save();

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
          role: user.role
        }
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};