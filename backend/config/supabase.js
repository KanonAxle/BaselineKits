// This file connects your backend to your Supabase database
const { createClient } = require('@supabase/supabase-js');

// Load the credentials from your .env file
require('dotenv').config();

// Create the connection using your Supabase URL and Key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Export so other files can use this connection
module.exports = supabase;