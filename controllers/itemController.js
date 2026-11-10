const { Item } = require('../models/Item');
const { AuditLog } = require('../models/AuditLog');
const { findMatches } = require('../services/smartMatcher');

/**
 * @desc    Get all items with optional filtering and search
 * @route   GET /api/items
 * @access  Public
 */
exports.getItems = async (req, res) => {
  try {
    const { type, category, status, q } = req.query;
    const filter = {};

    if (type && ['Lost', 'Found'].includes(type)) {
      filter.post_type = type;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (status && ['Open', 'Claimed', 'Returned'].includes(status)) {
      filter.status = status;
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { location: { $regex: searchRegex } }
      ];
    }

    const items = await Item.find(filter);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve items',
      error: error.message
    });
  }
};

/**
 * @desc    Get single item by ID
 * @route   GET /api/items/:id
 * @access  Public
 */
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found with id: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item details',
      error: error.message
    });
  }
};

/**
 * @desc    Create new lost or found item post
 * @route   POST /api/items
 * @access  Public
 */
exports.createItem = async (req, res) => {
  try {
    const { title, description, post_type, category, location, contact_info, status, image_url, creator_id, creator_name } = req.body;

    // --- Strict Field Validation ---
    const errors = [];
    if (!title || !title.trim()) errors.push('Title is required');
    if (!description || !description.trim()) errors.push('Description is required');
    if (!post_type || !['Lost', 'Found'].includes(post_type)) {
      errors.push('Post type must be either "Lost" or "Found"');
    }
    const validCategories = ['Electronics', 'Clothing', 'Books', 'Documents', 'Accessories', 'Other'];
    if (!category || !validCategories.includes(category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }
    if (!location || !location.trim()) errors.push('Location is required');
    if (!contact_info || !contact_info.trim()) errors.push('Contact info is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const effectiveCreatorId = req.user?.id || creator_id || req.headers['x-user-id'] || 'student-guest';
    const effectiveCreatorName = req.user?.name || creator_name || req.headers['x-user-name'] || 'Campus Student';
    const effectiveUsername = req.user?.username || 'student';
    const effectiveImageUrl = req.file ? `/uploads/${req.file.filename}` : (image_url || '');

    const newItem = await Item.create({
      title: title.trim(),
      description: description.trim(),
      post_type,
      category,
      location: location.trim(),
      contact_info: contact_info.trim(),
      status: status && ['Open', 'Claimed', 'Returned'].includes(status) ? status : 'Open',
      image_url: effectiveImageUrl,
      creator_id: effectiveCreatorId,
      creator_name: effectiveCreatorName,
      creator_username: effectiveUsername
    });

    // Audit Logging
    await AuditLog.create({
      action: 'ITEM_CREATED',
      actor_id: effectiveCreatorId,
      actor_username: effectiveUsername,
      actor_role: req.user?.role || 'student',
      target_type: 'item',
      target_id: newItem._id || newItem.id,
      details: `Student @${effectiveUsername} reported ${post_type} item "${newItem.title}" at ${newItem.location}`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      severity: 'info'
    });

    res.status(201).json({
      success: true,
      message: `${post_type} item reported successfully!`,
      data: newItem
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item post',
      error: error.message
    });
  }
};

/**
 * @desc    Update existing item
 * @route   PUT /api/items/:id
 * @access  Public
 */
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Item.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Item not found with id: ${id}`
      });
    }

    // Authorization Check: Only creator or admin can update
    const userId = req.user?.id || req.body?.user_id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.body?.user_role || req.headers['x-user-role'];
    const username = req.user?.username;

    const isAuthorized = 
      userRole === 'admin' ||
      (existing.creator_id && userId && existing.creator_id === userId) ||
      (existing.creator_username && username && existing.creator_username.toLowerCase() === username.toLowerCase());

    if (!isAuthorized) {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: userId || 'unknown',
        actor_username: username || 'guest',
        actor_role: userRole || 'student',
        target_type: 'item',
        target_id: id,
        details: `Access Denied: @${username || 'anonymous'} attempted unauthorized modification of post "${existing.title}"`,
        ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        severity: 'warning'
      });

      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the student who created this post or a campus administrator can edit it.'
      });
    }

    const { title, description, post_type, category, location, contact_info, status } = req.body;
    const updateData = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Title cannot be empty' });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ success: false, message: 'Description cannot be empty' });
      }
      updateData.description = description.trim();
    }

    if (post_type !== undefined) {
      if (!['Lost', 'Found'].includes(post_type)) {
        return res.status(400).json({ success: false, message: 'Post type must be "Lost" or "Found"' });
      }
      updateData.post_type = post_type;
    }

    if (category !== undefined) {
      const validCategories = ['Electronics', 'Clothing', 'Books', 'Documents', 'Accessories', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      updateData.category = category;
    }

    if (location !== undefined) {
      if (!location.trim()) {
        return res.status(400).json({ success: false, message: 'Location cannot be empty' });
      }
      updateData.location = location.trim();
    }

    if (contact_info !== undefined) {
      if (!contact_info.trim()) {
        return res.status(400).json({ success: false, message: 'Contact info cannot be empty' });
      }
      updateData.contact_info = contact_info.trim();
    }

    if (status !== undefined) {
      if (!['Open', 'Claimed', 'Returned'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be "Open", "Claimed", or "Returned"' });
      }
      updateData.status = status;
    }

    if (req.body.image_url !== undefined) {
      updateData.image_url = req.body.image_url;
    }
    if (req.file) {
      updateData.image_url = `/uploads/${req.file.filename}`;
    }

    const updatedItem = await Item.findByIdAndUpdate(id, updateData);

    // Log Update / Status Change to Audit Trail
    const isStatusOnly = Object.keys(updateData).length === 1 && updateData.status !== undefined;
    await AuditLog.create({
      action: isStatusOnly ? 'STATUS_CHANGED' : 'ITEM_UPDATED',
      actor_id: userId || 'student',
      actor_username: username || 'student',
      actor_role: userRole || 'student',
      target_type: 'item',
      target_id: id,
      details: isStatusOnly
        ? `Status of "${updatedItem.title}" updated to ${updatedItem.status} by @${username || 'user'}`
        : `Item "${updatedItem.title}" details updated by @${username || 'user'}`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      severity: 'info'
    });

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
};

/**
 * @desc    Delete item
 * @route   DELETE /api/items/:id
 * @access  Public
 */
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Item.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Item not found with id: ${id}`
      });
    }

    // Authorization Check: Only creator or admin can delete
    const userId = req.user?.id || req.body?.user_id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.body?.user_role || req.headers['x-user-role'];
    const username = req.user?.username;

    const isAuthorized = 
      userRole === 'admin' ||
      (existing.creator_id && userId && existing.creator_id === userId) ||
      (existing.creator_username && username && existing.creator_username.toLowerCase() === username.toLowerCase());

    if (!isAuthorized) {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: userId || 'unknown',
        actor_username: username || 'guest',
        actor_role: userRole || 'student',
        target_type: 'item',
        target_id: id,
        details: `Access Denied: unauthorized deletion attempt on "${existing.title}" by @${username || 'anonymous'}`,
        ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        severity: 'critical'
      });

      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the student who created this post or a campus administrator can delete it.'
      });
    }

    await Item.findByIdAndDelete(id);

    // Audit Log Deletion
    await AuditLog.create({
      action: 'ITEM_DELETED',
      actor_id: userId || 'user',
      actor_username: username || 'user',
      actor_role: userRole || 'student',
      target_type: 'item',
      target_id: id,
      details: `Post "${existing.title}" was permanently removed by @${username || 'user'}`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      severity: 'info'
    });

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
};

/**
 * @desc    Find smart matches for a given item (Lost <-> Found)
 * @route   GET /api/items/:id/matches
 * @access  Public / Optional Auth
 */
exports.getItemMatches = async (req, res) => {
  try {
    const { id } = req.params;
    const targetItem = await Item.findById(id);

    if (!targetItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const allItems = await Item.find({});
    const matches = findMatches(targetItem, allItems, 35);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find smart matches',
      error: error.message
    });
  }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/items/stats
 * @access  Public
 */
exports.getItemStats = async (req, res) => {
  try {
    const allItems = await Item.find({});

    const total = allItems.length;
    const lost = allItems.filter(i => i.post_type === 'Lost').length;
    const found = allItems.filter(i => i.post_type === 'Found').length;
    const open = allItems.filter(i => i.status === 'Open').length;
    const claimed = allItems.filter(i => i.status === 'Claimed').length;
    const returned = allItems.filter(i => i.status === 'Returned').length;

    res.status(200).json({
      success: true,
      data: {
        total,
        lost,
        found,
        open,
        claimed,
        returned
      }
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate stats',
      error: error.message
    });
  }
};
