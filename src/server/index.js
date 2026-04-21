const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProd ? true : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'docedit-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  },
  proxy: isProd
}));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/files', require('./routes/upload'));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`DocEdit server running on port ${PORT}`);
  });
}

start().catch(console.error);

module.exports = app;
