// Main server file - this is the entry point for your backend
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import route files
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const kitsRouter = require('./routes/kits');
const qaRouter = require('./routes/qa');
const ordersRouter = require('./routes/orders');
const checkoutRouter = require('./routes/checkout');

// Create the Express app
const app = express();

// Allow the frontend to communicate with this backend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Register routes
app.use('/api', authRouter);
app.use('/api', productsRouter);
app.use('/api', kitsRouter);
app.use('/api', qaRouter);
app.use('/api', ordersRouter);
app.use('/api', checkoutRouter);

// Health check - visit http://localhost:3000/api/health to confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
