const express = require('express');
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemStats
} = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');

// Summary statistics endpoint (must be defined before /:id)
router.get('/stats', getItemStats);

// Main CRUD routes
router.route('/')
  .get(optionalAuth, getItems)
  .post(protect, createItem);

router.route('/:id')
  .get(optionalAuth, getItemById)
  .put(protect, updateItem)
  .delete(protect, deleteItem);

module.exports = router;
