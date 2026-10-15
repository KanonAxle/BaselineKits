// Main server file - this is the entry point for your backend
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import route files
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const kitsRouter = require('./routes/kits');
const qaRouter = require('./routes/qa');
const ordersRouter = require('./routes/orders');
const checkoutRouter = require('./routes/checkout');
const adminRouter = require('./routes/admin');
const importUrlRouter = require('./routes/importUrl');
const uploadImageRouter = require('./routes/uploadImage');
const adminOrdersRouter = require('./routes/adminOrders');
const hybridRecommendationRouter = require('./routes/hybridRecommendation');
const addressLookupRouter = require('./routes/addressLookup');

// Create the Express app
const app = express();

// Allow only configured frontend origins to communicate with the API.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

// Preserve the exact Stripe payload for signature verification before parsing JSON.
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buffer) => {
    if (req.originalUrl === '/api/webhooks/stripe') req.rawBody = buffer;
  }
}));

// Register routes
app.use('/api', authRouter);
app.use('/api', productsRouter);
app.use('/api', kitsRouter);
app.use('/api', qaRouter);
app.use('/api', ordersRouter);
app.use('/api', checkoutRouter);
app.use('/api', adminRouter);
app.use('/api', importUrlRouter);
app.use('/api', uploadImageRouter);
app.use('/api', adminOrdersRouter);
app.use('/api', hybridRecommendationRouter);
app.use('/api', addressLookupRouter);

// Health check - visit /api/health to confirm the API is running
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
