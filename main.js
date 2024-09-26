const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const CACHE_FILE = path.join(__dirname, 'cache.json');
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

app.use(express.json());

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 requests per windowMs
});
app.use(limiter);


