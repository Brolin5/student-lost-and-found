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

// Summary statistics endpoint (must be defined before /:id)
router.get('/stats', getItemStats);

// Main CRUD routes
router.route('/')
  .get(getItems)
  .post(createItem);

router.route('/:id')
  .get(getItemById)
  .put(updateItem)
  .delete(deleteItem);

module.exports = router;
