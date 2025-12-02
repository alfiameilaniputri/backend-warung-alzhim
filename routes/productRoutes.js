const express = require("express");
const router = express.Router();
const {
    createProduct,
    getAllProducts,
    getDetailProduct,
    updateProduct,
    deleteProduct,
    searchProducts
} = require("../controllers/productController");

const upload = require("../middleware/uploadMiddleware");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Seller/Admin only routes
router.post(
    "/",
    protect,
    adminOnly,
    upload.array("images", 5),
    createProduct
);

router.put(
    "/:id",
    protect,
    adminOnly,
    upload.array("images", 5),
    updateProduct
);

router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteProduct
);

// Public routes
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/:id", getDetailProduct);

module.exports = router;
