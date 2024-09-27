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

// Filter products by category and price range
// [GET] http://localhost:3001/products/filter?category=beauty&minPrice=1&maxPrice=20
app.get('/products/filter', async (req, res) => {
  try {
    const products = await fetchData();
    let filteredProducts = products.products;

    if (req.query.category) {
      filteredProducts = filteredProducts.filter(
        (product) => product.category === req.query.category
      );
    }
    if (req.query.minPrice) {
      filteredProducts = filteredProducts.filter(
        (product) => product.price >= parseFloat(req.query.minPrice)
      );
    }
    if (req.query.maxPrice) {
      filteredProducts = filteredProducts.filter(
        (product) => product.price <= parseFloat(req.query.maxPrice)
      );
    }

    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sort products
// [GET] http://localhost:3001/products/sort?field=title&order=asc
app.get('/products/sort', async (req, res) => {
  try {
    // const { field, order } = req.query;
    if (!req.query.field || !['price', 'title'].includes(req.query.field)) {
      return res.status(400).json({ error: 'Invalid sort field' });
    }
    if (!req.query.order || !['asc', 'desc'].includes(req.query.order)) {
      return res.status(400).json({ error: 'Invalid sort order' });
    }

    const products = await fetchData();
    const sortedProducts = [...products.products].sort((a, b) => {
      if (req.query.order === 'asc') {
        return a[req.query.field] > b[req.query.field] ? 1 : -1;
      } else {
        return a[req.query.field] < b[req.query.field] ? 1 : -1;
      }
    });

    res.json(sortedProducts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product details by ID
// [GET] http://localhost:3001/products/12
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const products = await fetchData();
    const product = products.products.find((p) => p.id === parseInt(id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});