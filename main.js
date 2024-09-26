const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const CACHE_FILE = path.join(__dirname, 'cache.json');
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

app.use(express.json());