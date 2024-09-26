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

// Data retrieval and caching
async function fetchData() {
  try {
    const cacheStats = await fs.stat(CACHE_FILE).catch(() => null);
    if (
      cacheStats &&
      Date.now() - cacheStats.mtime.getTime() < CACHE_DURATION
    ) {
      return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    }

    const response = await axios.get('https://dummyjson.com/products');
    const data = response.data;
    await fs.writeFile(CACHE_FILE, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching or caching data:', error);
    throw error;
  }
}

// List all products
// [GET] http://localhost:3001/products
app.get('/products', async (req, res) => {
  try {
    const products = await fetchData();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products by name
// [GET] http://localhost:3001/products/search?title=Kiwi
app.get('/products/search', async (req, res) => {
  try {
    const query = req.query;
    if (!Object.keys(query)) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const products = await fetchData();
    const filteredProducts = products.products.filter((product) =>
      product.title.toLowerCase().includes(query?.title?.toLowerCase())
    );
    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});