const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemStats
} = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `item-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext) || (file.mimetype && file.mimetype.startsWith('image/'))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
    }
  }
});

// Image Upload Endpoint
router.post('/upload', optionalAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: `/uploads/${req.file.filename}`
    });
  });
});

// Summary statistics endpoint (must be defined before /:id)
router.get('/stats', getItemStats);

// Main CRUD routes
router.route('/')
  .get(optionalAuth, getItems)
  .post(protect, upload.single('image'), createItem);

router.route('/:id')
  .get(optionalAuth, getItemById)
  .put(protect, upload.single('image'), updateItem)
  .delete(protect, deleteItem);

module.exports = router;
