const express = require('express');
const router = express.Router();
const axios = require('axios');
const { rateLimit } = require('express-rate-limit');
const cors = require('cors');
const { text } = require('express');

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

router.use(cors());
router.use(apiLimiter); // Apply rate limiting to all routes

// Constants
const MIN_TEXT_LENGTH = 100;
const MAX_TEXT_LENGTH = 10000;
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

// Text validation middleware
const validateTextInput = (req, res, next) => {
  const { text, language = 'en' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Text is required and must be a string'
    });
  }

  if (text.length < MIN_TEXT_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Text must be at least ${MIN_TEXT_LENGTH} characters long`
    });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Text must be less than ${MAX_TEXT_LENGTH} characters`
    });
  }

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`
    });
  }

  req.validatedText = text.substring(0, MAX_TEXT_LENGTH); // Truncate if too long
  req.language = language;
  next();
};

// Standalone plagiarism check endpoint
router.post('/check', validateTextInput, async (req, res) => {
  try {
    const { validatedText: text, language } = req;
    const { detailed = false } = req.body;

    if (!process.env.QUETEXT_API_KEY) {
      throw new Error('Plagiarism check service is not configured');
    }

    // Check plagiarism using Quetext API
    const response = await axios.post(
      'https://api.quetext.com/v1/plagiarism',
      {
        text,
        language,
        scan: detailed ? 1 : 0 // Only get detailed matches if requested
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.QUETEXT_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    // Process the response
    const result = {
      success: true,
      score: response.data.score,
      plagiarism: response.data.plagiarism,
      warnings: response.data.warnings || [],
      language
    };

    // Only include matches if detailed scan was requested
    if (detailed) {
      result.matches = response.data.matches || [];
    }

    res.json(result);
  } catch (error) {
    console.error('Plagiarism check error:', error);

    let statusCode = 500;
    let errorMessage = 'Plagiarism check failed';

    if (error.response) {
      // The request was made and the server responded with a status code
      statusCode = error.response.status;
      errorMessage = error.response.data.message || `API error: ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from plagiarism service';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/status', async (req, res) => {
  try {
    if (!process.env.QUETEXT_API_KEY) {
      return res.json({
        service: 'plagiarism',
        status: 'disabled',
        message: 'QUETEXT_API_KEY not configured'
      });
    }

    // Make a lightweight request to check API status
    const response = await axios.get('https://api.quetext.com/v1/status', {
      headers: {
        'Authorization': `Bearer ${process.env.QUETEXT_API_KEY}`
      },
      timeout: 5000
    });

    res.json({
      service: 'plagiarism',
      status: 'operational',
      provider: 'Quetext',
      limits: {
        max_text_length: MAX_TEXT_LENGTH,
        min_text_length: MIN_TEXT_LENGTH,
        supported_languages: SUPPORTED_LANGUAGES
      },
      api_status: response.data
    });
  } catch (error) {
    res.status(503).json({
      service: 'plagiarism',
      status: 'unavailable',
      error: 'Unable to connect to plagiarism service'
    });
  }
});

module.exports = router;