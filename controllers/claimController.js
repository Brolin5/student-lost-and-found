const { Claim } = require('../models/Claim');
const { Item } = require('../models/Item');
const { AuditLog } = require('../models/AuditLog');

/**
 * @desc    Submit verification claim on an item
 * @route   POST /api/claims
 * @access  Protected
 */
exports.submitClaim = async (req, res) => {
  try {
    const { item_id, verification_answer, claimant_contact } = req.body;

    if (!item_id) {
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }
    if (!verification_answer || !verification_answer.trim()) {
      return res.status(400).json({ success: false, message: 'Verification description is required' });
    }

    const item = await Item.findById(item_id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Target item not found' });
    }

    const newClaim = await Claim.create({
      item_id,
      item_title: item.title,
      claimant_id: req.user.id,
      claimant_name: req.user.name,
      claimant_username: req.user.username,
      claimant_contact: claimant_contact?.trim() || req.user.username + '@nileuniversity.edu.ng',
      verification_answer: verification_answer.trim()
    });

    // Record in Audit Trail
    await AuditLog.create({
      action: 'CLAIM_SUBMITTED',
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: req.user.role,
      target_type: 'item',
      target_id: item_id,
      details: `Student @${req.user.username} submitted ownership claim on "${item.title}"`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      severity: 'info'
    });

    res.status(201).json({
      success: true,
      message: 'Claim request submitted! The finder has been notified to review your verification answer.',
      data: newClaim
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit claim request',
      error: error.message
    });
  }
};

/**
 * @desc    Get claims submitted by the logged in student
 * @route   GET /api/claims/my
 * @access  Protected
 */
exports.getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ claimant_id: req.user.id });
    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    console.error('Get my claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your claims',
      error: error.message
    });
  }
};

/**
 * @desc    Get all claims on an item (Access Control: Owner or Admin only)
 * @route   GET /api/claims/item/:itemId
 * @access  Protected
 */
exports.getItemClaims = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const isOwner = req.user.role === 'admin' ||
      (item.creator_id && item.creator_id === req.user.id) ||
      (item.creator_username && item.creator_username.toLowerCase() === req.user.username.toLowerCase());

    if (!isOwner) {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: req.user.id,
        actor_username: req.user.username,
        actor_role: req.user.role,
        target_type: 'claim',
        target_id: itemId,
        details: `Unauthorized attempt by @${req.user.username} to view claims for post "${item.title}"`,
        ip_address: req.ip || '127.0.0.1',
        severity: 'warning'
      });

      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the student who posted this item or campus security can view verification answers.'
      });
    }

    const claims = await Claim.find({ item_id: itemId });
    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    console.error('Get item claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve claims for item',
      error: error.message
    });
  }
};

/**
 * @desc    Approve or Reject a claim (Access Control: Owner or Admin only)
 * @route   PUT /api/claims/:id/status
 * @access  Protected
 */
exports.updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    const item = await Item.findById(claim.item_id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Referenced item not found' });
    }

    const isOwner = req.user.role === 'admin' ||
      (item.creator_id && item.creator_id === req.user.id) ||
      (item.creator_username && item.creator_username.toLowerCase() === req.user.username.toLowerCase());

    if (!isOwner) {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: req.user.id,
        actor_username: req.user.username,
        actor_role: req.user.role,
        target_type: 'claim',
        target_id: id,
        details: `Unauthorized attempt by @${req.user.username} to resolve claim for "${item.title}"`,
        ip_address: req.ip || '127.0.0.1',
        severity: 'critical'
      });

      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the poster or administrator can resolve this claim.'
      });
    }

    const updatedClaim = await Claim.updateStatus(id, status);

    // If approved, update item status to Claimed automatically
    if (status === 'Approved') {
      await Item.findByIdAndUpdate(item._id || item.id, { status: 'Claimed' });
    }

    // Audit Log
    await AuditLog.create({
      action: status === 'Approved' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: req.user.role,
      target_type: 'claim',
      target_id: id,
      details: `@${req.user.username} ${status.toLowerCase()} claim from @${claim.claimant_username} for "${item.title}"`,
      ip_address: req.ip || '127.0.0.1',
      severity: 'info'
    });

    res.status(200).json({
      success: true,
      message: `Claim successfully ${status.toLowerCase()}!`,
      data: updatedClaim
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim status',
      error: error.message
    });
  }
};
