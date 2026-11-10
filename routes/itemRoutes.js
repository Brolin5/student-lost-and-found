const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemStats,
  getItemMatches
} = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');

// Configure Cloudinary if credentials provided
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
}

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Image Upload Endpoint (Cloudinary + Local Fallback)
router.post('/upload', optionalAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
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

    // If Cloudinary credentials are set, upload directly to Cloudinary CDN
    if (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'nile_lost_and_found',
          resource_type: 'image'
        });
        return res.status(200).json({
          success: true,
          message: 'Image uploaded to Cloudinary successfully',
          url: result.secure_url
        });
      } catch (cloudErr) {
        console.error('[Cloudinary Error]:', cloudErr.message);
        // Fall through to local file url if network issue
      }
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

// Smart Match Suggestion endpoint
router.get('/:id/matches', optionalAuth, getItemMatches);

// Main CRUD routes
router.route('/')
  .get(optionalAuth, getItems)
  .post(protect, upload.single('image'), createItem);

router.route('/:id')
  .get(optionalAuth, getItemById)
  .put(protect, upload.single('image'), updateItem)
  .delete(protect, deleteItem);

module.exports = router;
