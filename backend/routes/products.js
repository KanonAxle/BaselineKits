// Products routes - handles fetching and managing individual items
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// -------------------------------------------------------
// ENDPOINT 1: Get All Products
// GET /api/products
// -------------------------------------------------------
router.get('/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.status(200).json(products);

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Get One Product by ID
// GET /api/products/:id
// -------------------------------------------------------
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(product);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error fetching product' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Create a Product (Admin only - TODO: add auth check)
// POST /api/products
// -------------------------------------------------------
router.post('/products', async (req, res) => {
  try {
    // TODO: add admin authentication check here
    const { name, description, category, price_cents, weight_grams, size, image_url, in_stock } = req.body;

    if (!name || !category || !price_cents) {
      return res.status(400).json({ error: 'Name, category, and price_cents are required' });
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([{ name, description, category, price_cents, weight_grams, size, image_url, in_stock }])
      .select();

    if (error) {
      return res.status(500).json({ error: 'Failed to create product' });
    }

    res.status(201).json(newProduct[0]);

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error creating product' });
  }
});

// -------------------------------------------------------
// ENDPOINT 4: Update a Product (Admin only - TODO: add auth check)
// PUT /api/products/:id
// -------------------------------------------------------
router.put('/products/:id', async (req, res) => {
  try {
    // TODO: add admin authentication check here
    const { id } = req.params;
    const updates = req.body;

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();

    if (error || !updatedProduct.length) {
      return res.status(404).json({ error: 'Product not found or update failed' });
    }

    res.status(200).json(updatedProduct[0]);

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error updating product' });
  }
});

module.exports = router;
