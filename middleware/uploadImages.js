const multer = require("multer");

// gunakan memoryStorage untuk proses resize di Sharp
const storage = multer.memoryStorage();

// Filter tipe file
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Hanya JPG, JPEG, PNG diperbolehkan"), false);
  }
};

// Konfigurasi multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Max 2MB
});

// Middleware untuk upload single
module.exports = upload.single("profileImage");
