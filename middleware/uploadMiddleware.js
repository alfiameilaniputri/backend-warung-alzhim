const multer = require("multer");
const path = require("path");

const generateShortCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();  
  const random = Math.random().toString(36).substr(2, 5).toUpperCase(); 
  return `${timestamp}-${random}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/products");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueCode = generateShortCode();
    cb(null, `WAZ-PROD-IMG-${uniqueCode}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error("Only images (jpeg, jpg, png) are allowed"));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
