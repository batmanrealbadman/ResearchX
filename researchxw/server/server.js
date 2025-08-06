const express = require('express');
const serverless = require('serverless-http');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

// Routers
const uploadRouter = require('./upload');
const plagiarismRouter = require('./plagiarism');
const paymentRouter = require('./payment');
const authRouter = require('./auth');

const app = express();

// Configuration
const API_PREFIX = '/.netlify/functions/server';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: IS_PRODUCTION 
    ? [process.env.FRONTEND_URL, 'https://yourdomain.com'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  }
});

// Logging
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));

// Body Parsing
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use(API_PREFIX, apiLimiter);

// Routes
app.use(`${API_PREFIX}/upload`, uploadRouter);
app.use(`${API_PREFIX}/plagiarism`, plagiarismRouter);
app.use(`${API_PREFIX}/payment`, paymentRouter);
app.use(`${API_PREFIX}/auth`, authRouter);

// Enhanced Health Check
app.get(`${API_PREFIX}/health`, (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development'
    }
  };
  res.status(200).json(healthcheck);
});

// API Documentation
app.get(`${API_PREFIX}/docs`, (req, res) => {
  res.json({
    endpoints: {
      upload: `${API_PREFIX}/upload`,
      plagiarism: `${API_PREFIX}/plagiarism`,
      payment: `${API_PREFIX}/payment`,
      auth: `${API_PREFIX}/auth`
    },
    status: 'operational',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 Handler
app.use(`${API_PREFIX}/*`, (req, res) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Endpoint not found',
    docs: `${API_PREFIX}/docs`
  });
});

// Global Error Handler
app.use(errorHandler);

// Serverless configuration
module.exports = app;
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/msword']
});