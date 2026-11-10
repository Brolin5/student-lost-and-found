const mongoose = require('mongoose');
const { Pool } = require('pg');

let isConnected = false;
let pgPool = null;

/**
 * Connect to PostgreSQL (if DATABASE_URL is set), MongoDB (if MONGODB_URI is set),
 * or fall back gracefully to persistent local file store.
 */
const connectDB = async () => {
  // 1. Check for PostgreSQL Connection String
  const pgUri = process.env.DATABASE_URL || process.env.POSTGRES_URI;
  if (pgUri && pgUri.trim() !== '' && !pgUri.includes('username:password')) {
    try {
      pgPool = new Pool({
        connectionString: pgUri,
        ssl: pgUri.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      // Test connection and auto-create tables if they don't exist
      const client = await pgPool.connect();
      console.log('[Database] PostgreSQL Connected successfully!');

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          username VARCHAR(60) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(30) DEFAULT 'student',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS items (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(120) NOT NULL,
          description TEXT NOT NULL,
          post_type VARCHAR(20) NOT NULL,
          category VARCHAR(60) NOT NULL,
          location VARCHAR(120) NOT NULL,
          contact_info VARCHAR(120) NOT NULL,
          status VARCHAR(30) DEFAULT 'Open',
          image_url TEXT DEFAULT '',
          creator_id VARCHAR(64),
          creator_name VARCHAR(120),
          creator_username VARCHAR(60),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS claims (
          id VARCHAR(64) PRIMARY KEY,
          item_id VARCHAR(64) NOT NULL,
          claimant_id VARCHAR(64) NOT NULL,
          claimant_name VARCHAR(120) NOT NULL,
          claimant_username VARCHAR(60) NOT NULL,
          claimant_contact VARCHAR(120) NOT NULL,
          verification_answer TEXT NOT NULL,
          status VARCHAR(30) DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          action VARCHAR(60) NOT NULL,
          actor_id VARCHAR(64),
          actor_username VARCHAR(60),
          actor_role VARCHAR(30),
          target_type VARCHAR(40),
          target_id VARCHAR(64),
          details TEXT NOT NULL,
          ip_address VARCHAR(80),
          severity VARCHAR(20) DEFAULT 'info',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      client.release();
      isConnected = true;
      return true;
    } catch (pgErr) {
      console.error('[Database Error] PostgreSQL connection failed:', pgErr.message);
      console.log('[Database] Falling back to file store / MongoDB...');
      pgPool = null;
    }
  }

  // 2. Check for MongoDB Atlas Connection String
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.trim() !== '' && !mongoUri.includes('your_mongodb_connection_string_here')) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (error) {
      console.error(`[Database Error] MongoDB connection failed: ${error.message}`);
      isConnected = false;
    }
  }

  // 3. Graceful Fallback to Local Persistent File Store
  console.log('[Database] No active remote DB provided. Running in Persistent File Store mode (data/items.json).');
  isConnected = false;
  return false;
};

const getIsConnected = () => isConnected;
const getPgPool = () => pgPool;

module.exports = { connectDB, getIsConnected, getPgPool };
