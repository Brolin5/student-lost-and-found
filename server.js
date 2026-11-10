require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const authRoutes = require('./routes/authRoutes');
const {
  initRealtimeServer,
  startKeepAlivePlunger,
  triggerPlungerPing,
  getPlungerStats
} = require('./services/realtimeService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Initialize WebSocket Server on the same HTTP server (/ws)
initRealtimeServer(server);

// Middleware with CORS support for Vercel Frontend + Render Backend
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure public/uploads directory exists and is served statically
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve compiled React build (dist) if available, otherwise serve public
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', require('./routes/claimRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/upload', (req, res, next) => {
  req.url = '/upload';
  itemRoutes(req, res, next);
});

// Health check & Keep-Alive Plunger status endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Student Lost-and-Found API',
    plunger: getPlungerStats()
  });
});

// Explicit Plunger trigger & status endpoint to keep Render instance warm
app.get('/api/plunger', async (req, res) => {
  const stats = getPlungerStats();
  res.status(200).json({
    success: true,
    message: 'Render Keep-Alive Plunger is active',
    data: stats
  });
});

app.post('/api/plunger/ping', async (req, res) => {
  const result = await triggerPlungerPing();
  res.status(200).json({
    success: true,
    pingResult: result,
    data: getPlungerStats()
  });
});

// Fallback for SPA/HTML routes: serve React index from dist or public
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`
    });
  }
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
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

// Start Server & Keep-Alive Plunger when executed directly
if (require.main === module) {
  server.listen(PORT, () => {
    startKeepAlivePlunger();
    console.log(`===============================================`);
    console.log(` Campus Lost & Found System running on port ${PORT}`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` WebSocket URL: ws://localhost:${PORT}/ws`);
    console.log(` Health & Plunger: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
