const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { getIsConnected } = require('../config/db');

// --- 1. Mongoose Schema Definition ---
const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Item title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  post_type: {
    type: String,
    required: [true, 'Post type is required (Lost or Found)'],
    enum: {
      values: ['Lost', 'Found'],
      message: 'Post type must be either "Lost" or "Found"'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Electronics', 'Clothing', 'Books', 'Documents', 'Accessories', 'Other'],
      message: '{VALUE} is not a valid category'
    }
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [120, 'Location cannot exceed 120 characters']
  },
  contact_info: {
    type: String,
    required: [true, 'Contact info is required'],
    trim: true,
    maxlength: [100, 'Contact info cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['Open', 'Claimed', 'Returned'],
      message: 'Status must be "Open", "Claimed", or "Returned"'
    },
    default: 'Open'
  },
  creator_id: {
    type: String,
    default: 'guest-user'
  },
  creator_name: {
    type: String,
    default: 'Anonymous Student'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const MongoItem = mongoose.model('Item', itemSchema);

// --- 2. File-Based Persistent Store (Fallback for Offline / Local Dev) ---
const DATA_FILE = path.join(__dirname, '..', 'data', 'items.json');

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    // Seed with realistic sample items for immediate demonstration
    const seedData = [
      {
        _id: 'seed-item-1',
        title: 'Black Water Bottle (Hydro Flask)',
        description: 'Matte black 750ml water bottle left near the 2nd row in Lecture Theatre B.',
        post_type: 'Lost',
        category: 'Accessories',
        location: 'Lecture Theatre B',
        contact_info: 'tunde.sample@campus.edu',
        status: 'Open',
        creator_id: 'user-tunde',
        creator_name: 'Tunde Adebayo',
        creator_username: 'tunde',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        _id: 'seed-item-2',
        title: 'Scientific Calculator (Casio fx-991EX)',
        description: 'Found on a table in the Science Library 1st floor reading section.',
        post_type: 'Found',
        category: 'Electronics',
        location: 'Science Library, 1st Floor',
        contact_info: 'admin.security@campus.edu',
        status: 'Open',
        creator_id: 'user-admin',
        creator_name: 'Campus Security Desk',
        creator_username: 'admin',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        _id: 'seed-item-3',
        title: 'Brown Leather Wallet with Student ID',
        description: 'Contains student ID card and bus pass. Handed over to student affairs.',
        post_type: 'Found',
        category: 'Documents',
        location: 'Campus Cafeteria walkway',
        contact_info: 'chioma.sample@campus.edu',
        status: 'Returned',
        creator_id: 'user-chioma',
        creator_name: 'Chioma Okeke',
        creator_username: 'chioma',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString()
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedData, null, 2), 'utf8');
  }
};

const readItemsFromFile = () => {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

const writeItemsToFile = (items) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
};

const generateId = () => {
  return 'item_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// --- 3. Unified Repository Interface ---
const ItemRepository = {
  /**
   * Find items matching filter criteria
   */
  async find(filter = {}) {
    if (getIsConnected()) {
      return await MongoItem.find(filter).sort({ created_at: -1 });
    }

    let items = readItemsFromFile();
    if (filter.post_type) {
      items = items.filter(i => i.post_type === filter.post_type);
    }
    if (filter.category) {
      items = items.filter(i => i.category === filter.category);
    }
    if (filter.status) {
      items = items.filter(i => i.status === filter.status);
    }
    if (filter.$or) {
      // Simple keyword search matching
      items = items.filter(i => {
        return filter.$or.some(condition => {
          const key = Object.keys(condition)[0];
          const regex = condition[key].$regex;
          return regex && regex.test(i[key] || '');
        });
      });
    }
    // Sort newest first
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Find single item by ID
   */
  async findById(id) {
    if (getIsConnected()) {
      return await MongoItem.findById(id);
    }
    const items = readItemsFromFile();
    return items.find(i => (i._id === id || i.id === id)) || null;
  },

  /**
   * Create a new item
   */
  async create(data) {
    if (getIsConnected()) {
      return await MongoItem.create(data);
    }

    const items = readItemsFromFile();
    const newItem = {
      _id: generateId(),
      title: data.title.trim(),
      description: data.description.trim(),
      post_type: data.post_type,
      category: data.category,
      location: data.location.trim(),
      contact_info: data.contact_info.trim(),
      status: data.status || 'Open',
      creator_id: data.creator_id || 'guest-student',
      creator_name: data.creator_name || 'Campus Student',
      created_at: new Date().toISOString()
    };
    items.unshift(newItem);
    writeItemsToFile(items);
    return newItem;
  },

  /**
   * Update an existing item by ID
   */
  async findByIdAndUpdate(id, data, options = {}) {
    if (getIsConnected()) {
      return await MongoItem.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }

    const items = readItemsFromFile();
    const index = items.findIndex(i => (i._id === id || i.id === id));
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    writeItemsToFile(items);
    return items[index];
  },

  /**
   * Delete an item by ID
   */
  async findByIdAndDelete(id) {
    if (getIsConnected()) {
      return await MongoItem.findByIdAndDelete(id);
    }

    const items = readItemsFromFile();
    const index = items.findIndex(i => (i._id === id || i.id === id));
    if (index === -1) return null;

    const [deleted] = items.splice(index, 1);
    writeItemsToFile(items);
    return deleted;
  },

  /**
   * Count documents matching filter
   */
  async countDocuments(filter = {}) {
    if (getIsConnected()) {
      return await MongoItem.countDocuments(filter);
    }
    const filtered = await this.find(filter);
    return filtered.length;
  }
};

module.exports = { Item: ItemRepository, MongoItem };
