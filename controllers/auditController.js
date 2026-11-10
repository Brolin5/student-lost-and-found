const { AuditLog } = require('../models/AuditLog');

/**
 * @desc    Get audit trail activity logs with optional filtering
 * @route   GET /api/audit-logs
 * @access  Protected (All authenticated students/admins)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, actor } = req.query;
    const filter = {};
    if (action && action !== 'All') filter.action = action;
    if (actor && actor.trim()) filter.actor_username = actor.trim();

    const logs = await AuditLog.find(filter);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Audit logs retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trail logs',
      error: error.message
    });
  }
};
