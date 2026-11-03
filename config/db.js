const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB or establish fallback state.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('your_mongodb_connection_string_here')) {
    console.log('[Database] No MONGODB_URI provided. Running in Persistent File Store mode (data/items.json).');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[Database Error] MongoDB connection failed: ${error.message}`);
    console.log('[Database] Falling back to Persistent File Store mode (data/items.json).');
    isConnected = false;
    return false;
  }
};

const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };
