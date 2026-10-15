// Admin routes - login and protected management endpoints
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const requireAdmin = require('../middleware/requireAdmin');
const supabase = require('../config/supabase');
const { createRecommendationConfigStore } = require('./recommendationConfig');
const { getRecommendationWeights, setRecommendationWeights } = createRecommendationConfigStore(supabase);

// POST /api/admin/login
// Body: { password }
// Returns: { token } if password matches ADMIN_SECRET env var
router.post('/admin/login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

router.get('/admin/recommendation-weights', requireAdmin, async (req, res) => {
  try {
    const weights = await getRecommendationWeights();
    res.json(weights);
  } catch (error) {
    console.error('Get recommendation weights error:', error);
    res.status(500).json({ error: 'Failed to load recommendation weights' });
  }
});

router.put('/admin/recommendation-weights', requireAdmin, async (req, res) => {
  try {
    const { weights } = req.body || {};
    if (!weights || typeof weights !== 'object') {
      return res.status(400).json({ error: 'Weights payload is required.' });
    }

    const nextWeights = await setRecommendationWeights(weights);
    res.json(nextWeights);
  } catch (error) {
    console.error('Update recommendation weights error:', error);
    res.status(500).json({ error: 'Failed to save recommendation weights' });
  }
});

module.exports = router;
