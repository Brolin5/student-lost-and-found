const { AuditLog } = require('../models/AuditLog');

/**
 * @desc    Get audit trail activity logs with optional filtering
 * @route   GET /api/audit-logs
 * @access  Protected - Administrator only (RBAC)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    // Strict Access Control: Only admins can view audit logs
    if (req.user.role !== 'admin') {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: req.user.id,
        actor_username: req.user.username,
        actor_role: req.user.role,
        target_type: 'audit_log',
        target_id: 'audit_system',
        details: `Access Denied: Student @${req.user.username} attempted unauthorized access to administrative audit trail`,
        ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        severity: 'critical'
      });

      return res.status(403).json({
        success: false,
        message: 'Permission denied: Campus security audit trail is restricted to administrators only.'
      });
    }

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
