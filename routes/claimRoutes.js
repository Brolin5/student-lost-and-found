const express = require('express');
const router = express.Router();
const {
  submitClaim,
  getMyClaims,
  getItemClaims,
  updateClaimStatus
} = require('../controllers/claimController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitClaim);
router.get('/my', protect, getMyClaims);
router.get('/item/:itemId', protect, getItemClaims);
router.put('/:id/status', protect, updateClaimStatus);

module.exports = router;
