require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/items', itemRoutes);

// Health check endpoint for deployment monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Student Lost-and-Found API'
  });
});

// Fallback for SPA/HTML routes: serve index.html if no matching file
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`
    });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` Campus Lost & Found System running on port ${PORT}`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
