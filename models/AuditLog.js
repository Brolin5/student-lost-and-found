const fs = require('fs');
const path = require('path');
const { getPgPool } = require('../config/db');

const AUDIT_FILE = path.join(__dirname, '..', 'data', 'audit_logs.json');

function ensureFile() {
  if (!fs.existsSync(AUDIT_FILE)) {
    fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
    fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');
  }
}

function readAuditFile() {
  ensureFile();
  try {
    const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAuditFile(data) {
  ensureFile();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const AuditLog = {
  async create({ action, actor_id, actor_username, actor_role, target_type, target_id, details, ip_address, severity = 'info' }) {
    const pool = getPgPool();
    const id = 'audit-' + Date.now() + '-' + Math.round(Math.random() * 1e5);
    const timestamp = new Date().toISOString();

    const record = {
      id,
      action,
      actor_id: actor_id || 'anonymous',
      actor_username: actor_username || 'guest',
      actor_role: actor_role || 'student',
      target_type: target_type || 'general',
      target_id: target_id || '',
      details: details || '',
      ip_address: ip_address || '127.0.0.1',
      severity,
      created_at: timestamp
    };

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (id, action, actor_id, actor_username, actor_role, target_type, target_id, details, ip_address, severity, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [record.id, record.action, record.actor_id, record.actor_username, record.actor_role, record.target_type, record.target_id, record.details, record.ip_address, record.severity, record.created_at]
        );
        return record;
      } catch (err) {
        console.error('[AuditLog Postgres Error]', err.message);
      }
    }

    const logs = readAuditFile();
    logs.unshift(record); // Newest first
    writeAuditFile(logs);
    return record;
  },

  async find(filter = {}) {
    const pool = getPgPool();
    if (pool) {
      try {
        let query = 'SELECT * FROM audit_logs ORDER BY created_at DESC';
        const res = await pool.query(query);
        return res.rows;
      } catch (err) {
        console.error('[AuditLog Postgres Query Error]', err.message);
      }
    }

    let logs = readAuditFile();
    if (filter.action && filter.action !== 'All') {
      logs = logs.filter(l => l.action === filter.action);
    }
    if (filter.actor_username) {
      logs = logs.filter(l => l.actor_username.toLowerCase() === filter.actor_username.toLowerCase());
    }
    return logs;
  }
};

module.exports = { AuditLog };
