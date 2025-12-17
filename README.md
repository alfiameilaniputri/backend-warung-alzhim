# ⚙️ Warung Alzhim E-Commerce (Backend)
![License](https://img.shields.io/badge/license-LGPLv3-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Tech](https://img.shields.io/badge/Node.js-MERN_Stack-green)

---

## 📖 Tentang Proyek

Proyek ini merupakan bagian dari skripsi berjudul:

> **“Perancangan dan Implementasi Sistem E-commerce Warung Alzhim Berbasis MERN Stack dengan Metode Prototype”**  
> oleh **Alfia Meilani Putri**  
> Fakultas Ilmu Komputer, Universitas Singaperbangsa Karawang (2025)

Bagian **backend** dari sistem ini dikembangkan menggunakan **Node.js**, **Express.js**, dan **MongoDB**.  
Backend berfungsi sebagai penyedia layanan API yang mengatur autentikasi pengguna, pengelolaan produk, transaksi, serta integrasi pembayaran dengan **Midtrans Snap API**.

---

## ⚙️ Teknologi yang Digunakan
- 🟩 Node.js  
- 🚀 Express.js  
- 🍃 MongoDB & Mongoose  
- 💳 Midtrans Snap API  
- ✉️ Nodemailer (pengiriman email)  
- 🔐 JWT (JSON Web Token)  
- 🔄 Git & GitHub  

---

## 🚀 Panduan Instalasi dan Penggunaan

### 1️⃣ Clone Repository
```bash
git clone https://github.com/alfiameilaniputri/backend-warung-alzhim.git
cd backend-warung-alzhim
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Konfigurasi Environment
Buat file `.env` di root proyek dengan isi berikut:

```bash
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster-url/dbname
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxx
EMAIL_USER=youremail@example.com
EMAIL_PASS=yourpassword
JWT_SECRET=yourjwtsecret
```

> ⚠️ **Catatan penting:**  
> Jangan unggah file `.env` ke GitHub.  
> Pastikan nama file `.env` ada di `.gitignore`.

### 4️⃣ Jalankan Server
```bash
npm start
```

Server akan berjalan di:  
👉 [http://localhost:3000](http://localhost:3000)

---

## 🧩 Struktur Direktori

```bash
backend-warung-alzhim/
├── config/                 # Konfigurasi database dan environment
├── controllers/            # Logika bisnis (auth, produk, transaksi, dsb)
├── cron/                   # Cron job otomatis (jika ada tugas terjadwal)
├── middleware/             # Middleware (auth, error handler, dll)
├── models/                 # Model MongoDB (schema)
├── public/                 # File statis (jika dibutuhkan)
├── routes/                 # Routing API endpoint
├── utils/                  # Fungsi utilitas (midtrans.js, sendEmail.js, dll)
│   ├── iris.js
│   ├── midtrans.js
│   └── sendEmail.js
├── .env                    # Variabel environment (tidak diupload ke GitHub)
├── .gitignore              # Daftar file/folder yang diabaikan Git
├── index.js                # Entry point utama aplikasi
├── package.json            # Metadata proyek dan dependensi
├── package-lock.json       # Versi dependensi yang digunakan
└── README.md               # Dokumentasi proyek
```

---

## 🧠 Fitur Utama
- 🔐 Autentikasi pengguna (registrasi, login, JWT)  
- 🛒 Manajemen produk & transaksi  
- 💳 Integrasi pembayaran digital (Midtrans API)  
- ✉️ Notifikasi melalui email otomatis  
- 📊 Laporan penjualan & dashboard API  
- 🧱 Struktur modular (Controller-Service-Model pattern)

---

## 🧪 Pengujian
- **Metode:** Black-box Testing & Postman API Testing  
- **Hasil:** Semua endpoint utama (produk, pengguna, transaksi) berjalan sesuai ekspektasi.  
- **Validasi:** Terhubung sukses dengan frontend React & API Midtrans.  

---

## 🛠️ Maintenance Implementation
Tahap *Maintenance* dilakukan untuk memastikan sistem tetap stabil dan mudah dikembangkan di masa mendatang.  
Langkah-langkah implementasi:
- 📄 Dokumentasi backend melalui file `README.md`  
- 💾 Pengelolaan versi kode dengan Git & GitHub  
- 🔓 Penggunaan lisensi terbuka **LGPL v3.0**  
- 🌐 Publikasi repositori backend untuk keperluan pengujian dan pembelajaran  

---

## 📜 Lisensi
Proyek ini dilisensikan di bawah **GNU Lesser General Public License v3.0**.  
Lihat file [LICENSE](./LICENSE) untuk informasi lengkap.  

---

## 👩‍💻 Pengembang
**Alfia Meilani Putri**  
Fakultas Ilmu Komputer, Universitas Singaperbangsa Karawang (2025)

📎 **Repositori Frontend:**  
[https://github.com/alfiameilaniputri/frontend-warung-alzhim](https://github.com/alfiameilaniputri/frontend-warung-alzhim)
