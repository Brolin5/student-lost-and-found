const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { signToken } = require('../middleware/auth');
const { AuditLog } = require('../models/AuditLog');

/**
 * @desc    Register a new student account
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    // Validation
    const errors = [];
    if (!name || !name.trim()) errors.push('Full name is required');
    if (!username || !username.trim()) errors.push('Username is required');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" is already taken. Please choose another.`
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      username: cleanUsername,
      password: hashedPassword,
      role: 'student'
    });

    const token = signToken(newUser);

    // Log registration audit event
    await AuditLog.create({
      action: 'AUTH_REGISTER',
      actor_id: newUser._id || newUser.id,
      actor_username: newUser.username,
      actor_role: newUser.role,
      target_type: 'user',
      target_id: newUser._id || newUser.id,
      details: `New student registration completed for ${newUser.name} (@${newUser.username})`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      severity: 'info'
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser._id || newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register account',
      error: error.message
    });
  }
};

/**
 * @desc    Sign in user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password'
      });
    }

    const cleanUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: 'unknown',
        actor_username: cleanUsername,
        actor_role: 'guest',
        target_type: 'auth',
        target_id: cleanUsername,
        details: `Failed sign-in attempt: username "${cleanUsername}" does not exist`,
        ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        severity: 'warning'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor_id: user._id || user.id,
        actor_username: user.username,
        actor_role: user.role,
        target_type: 'auth',
        target_id: user.username,
        details: `Failed sign-in attempt: incorrect password supplied for @${user.username}`,
        ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        severity: 'warning'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const token = signToken(user);

    // Audit successful login
    await AuditLog.create({
      action: 'AUTH_LOGIN',
      actor_id: user._id || user.id,
      actor_username: user.username,
      actor_role: user.role,
      target_type: 'auth',
      target_id: user.username,
      details: `Student @${user.username} authenticated successfully via web portal`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      severity: 'info'
    });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id || user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sign in',
      error: error.message
    });
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private (protect middleware)
 */
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message
    });
  }
};
