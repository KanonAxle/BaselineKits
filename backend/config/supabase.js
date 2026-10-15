// This file connects your backend to your Supabase database
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load the credentials from your .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Create the connection using your Supabase URL and Key
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Supabase URL or SUPABASE_KEY is missing. Create a .env file with SUPABASE_URL and SUPABASE_KEY.');
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Export so other files can use this connection
module.exports = supabase;