const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getIsConnected } = require('../config/db');

// --- 1. Mongoose User Schema ---
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [60, 'Name cannot exceed 60 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const MongoUser = mongoose.model('User', userSchema);

// --- 2. File-Based Persistent Store for Users ---
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

const ensureUsersFile = () => {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    // Seed with initial demo accounts
    const seedUsers = [
      {
        _id: 'user-tunde',
        username: 'tunde',
        name: 'Tunde Adebayo',
        password: bcrypt.hashSync('password123', salt),
        role: 'student',
        created_at: new Date().toISOString()
      },
      {
        _id: 'user-chioma',
        username: 'chioma',
        name: 'Chioma Okeke',
        password: bcrypt.hashSync('password123', salt),
        role: 'student',
        created_at: new Date().toISOString()
      },
      {
        _id: 'user-admin',
        username: 'admin',
        name: 'Campus Security Desk',
        password: bcrypt.hashSync('admin123', salt),
        role: 'admin',
        created_at: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers, null, 2), 'utf8');
  }
};

const readUsersFromFile = () => {
  ensureUsersFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeUsersToFile = (users) => {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
};

const generateUserId = () => {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
};

// --- 3. Unified User Repository Interface ---
const UserRepository = {
  async findOne(query = {}) {
    if (getIsConnected()) {
      return await MongoUser.findOne(query);
    }
    const users = readUsersFromFile();
    if (query.username) {
      const target = query.username.toLowerCase().trim();
      return users.find(u => u.username.toLowerCase() === target) || null;
    }
    if (query._id) {
      return users.find(u => (u._id === query._id || u.id === query._id)) || null;
    }
    return null;
  },

  async findById(id) {
    return await this.findOne({ _id: id });
  },

  async create(data) {
    if (getIsConnected()) {
      return await MongoUser.create(data);
    }
    const users = readUsersFromFile();
    const newUser = {
      _id: generateUserId(),
      username: data.username.toLowerCase().trim(),
      name: data.name.trim(),
      password: data.password,
      role: data.role || 'student',
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    writeUsersToFile(users);
    return newUser;
  }
};

module.exports = { User: UserRepository, MongoUser };
