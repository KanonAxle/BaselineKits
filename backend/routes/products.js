// Products routes - handles fetching and managing individual items
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAdmin = require('../middleware/requireAdmin');

// Admin product inventory includes products hidden from the public catalog.
router.get('/admin/products', requireAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Supabase admin fetch products error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// -------------------------------------------------------
// ENDPOINT 1: Get All Products
// GET /api/products
// -------------------------------------------------------
router.get('/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_visible', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Supabase fetch products error:', error);
      return res.status(500).json({ error: 'Failed to fetch products', details: error.message || error });
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
      .eq('is_visible', true)
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
// ENDPOINT 3: Create a Product (Admin only)
// POST /api/products
// -------------------------------------------------------
router.post('/products', requireAdmin, async (req, res) => {
  try {
    const { name, description, brand, category, price_cents, cost_cents, country_of_origin, weight_grams, size, sizes, image_url, images, colors, variant_groups, link, in_stock, image_fit, is_visible, requires_sizing } = req.body;

    if (!name || !category || !price_cents) {
      return res.status(400).json({ error: 'Name, category, and price_cents are required' });
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([{ name, description, brand, category, price_cents, cost_cents: cost_cents || null, country_of_origin: country_of_origin || null, weight_grams, size, sizes: sizes || [], image_url, images, colors, variant_groups: variant_groups || null, link: link || null, in_stock: in_stock ? 1 : 0, image_fit: image_fit || 'contain', is_visible: is_visible === true, requires_sizing: requires_sizing || false }])
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
// ENDPOINT 4: Update a Product (Admin only)
// PUT /api/products/:id
// -------------------------------------------------------
router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if ('in_stock' in updates) {
      updates.in_stock = updates.in_stock ? 1 : 0;
    }

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: error.message || 'Update failed', details: error });
    }
    if (!updatedProduct || !updatedProduct.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(updatedProduct[0]);

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error updating product' });
  }
});

// -------------------------------------------------------
// ENDPOINT 5: Delete a Product (Admin only)
// DELETE /api/products/:id
// -------------------------------------------------------
router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Remove any kit_items referencing this product first (FK constraint)
    await supabase.from('kit_items').delete().eq('product_id', id);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.status(200).json({ message: 'Product deleted' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error deleting product' });
  }
});

module.exports = router;
