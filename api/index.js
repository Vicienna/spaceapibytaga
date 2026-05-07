const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const connectToDatabase = require('../db');

// Import route modules
const thrustersRouter = require('../routes/thrusters');
const shieldsRouter = require('../routes/shields');
const tanksRouter = require('../routes/tanks');
const planetsRouter = require('../routes/planets');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB (singleton) – for serverless, connection is reused
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/thrusters', thrustersRouter);
app.use('/api/shields', shieldsRouter);
app.use('/api/tanks', tanksRouter);
app.use('/api/planets', planetsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Export handler for Vercel
module.exports = app;
module.exports.handler = serverless(app);
