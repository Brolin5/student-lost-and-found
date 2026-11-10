const fs = require('fs');
const path = require('path');
const { getPgPool } = require('../config/db');

const CLAIMS_FILE = path.join(__dirname, '..', 'data', 'claims.json');

function ensureFile() {
  if (!fs.existsSync(CLAIMS_FILE)) {
    fs.mkdirSync(path.dirname(CLAIMS_FILE), { recursive: true });
    fs.writeFileSync(CLAIMS_FILE, '[]', 'utf8');
  }
}

function readClaimsFile() {
  ensureFile();
  try {
    const raw = fs.readFileSync(CLAIMS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeClaimsFile(data) {
  ensureFile();
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const Claim = {
  async create({ item_id, item_title, claimant_id, claimant_name, claimant_username, claimant_contact, verification_answer }) {
    const pool = getPgPool();
    const id = 'claim-' + Date.now() + '-' + Math.round(Math.random() * 1e5);
    const timestamp = new Date().toISOString();

    const record = {
      id,
      item_id,
      item_title: item_title || 'Campus Item',
      claimant_id,
      claimant_name,
      claimant_username,
      claimant_contact,
      verification_answer,
      status: 'Pending', // Pending, Approved, Rejected
      created_at: timestamp
    };

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO claims (id, item_id, claimant_id, claimant_name, claimant_username, claimant_contact, verification_answer, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [record.id, record.item_id, record.claimant_id, record.claimant_name, record.claimant_username, record.claimant_contact, record.verification_answer, record.status, record.created_at]
        );
        return record;
      } catch (err) {
        console.error('[Claim Postgres Error]', err.message);
      }
    }

    const claims = readClaimsFile();
    claims.unshift(record);
    writeClaimsFile(claims);
    return record;
  },

  async find(filter = {}) {
    const pool = getPgPool();
    if (pool) {
      try {
        let query = 'SELECT * FROM claims ORDER BY created_at DESC';
        const res = await pool.query(query);
        return res.rows;
      } catch (err) {
        console.error('[Claim Postgres Query Error]', err.message);
      }
    }

    let claims = readClaimsFile();
    if (filter.item_id) {
      claims = claims.filter(c => c.item_id === filter.item_id);
    }
    if (filter.claimant_id) {
      claims = claims.filter(c => c.claimant_id === filter.claimant_id);
    }
    return claims;
  },

  async findById(id) {
    const claims = await this.find({});
    return claims.find(c => c.id === id);
  },

  async updateStatus(id, newStatus) {
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('UPDATE claims SET status = $1 WHERE id = $2', [newStatus, id]);
      } catch (err) {
        console.error('[Claim Postgres Update Error]', err.message);
      }
    }

    const claims = readClaimsFile();
    const idx = claims.findIndex(c => c.id === id);
    if (idx !== -1) {
      claims[idx].status = newStatus;
      writeClaimsFile(claims);
      return claims[idx];
    }
    return null;
  }
};

module.exports = { Claim };
