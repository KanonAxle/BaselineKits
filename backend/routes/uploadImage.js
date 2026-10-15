const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const requireAdmin = require('../middleware/requireAdmin');

// ── Supabase client with service role key for storage writes ───────────────
// Uses SUPABASE_SERVICE_KEY if set, otherwise falls back to SUPABASE_KEY
// IMPORTANT: use your service_role key (not anon key) so uploads bypass RLS
const storageClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

const BUCKET = 'product-images';
const MAX_SIZE = 4 * 1024 * 1024; // Stay below Vercel's 4.5 MB function request-body limit.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF, AVIF, HEIC)'));
    }
  },
});

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

// POST /api/admin/upload-image
// Accepts: multipart/form-data with field "image"
// Returns: { url: "https://..." }
router.post(
  '/admin/upload-image',
  requireAdmin,
  (req, res, next) => {
    // Run multer and surface its errors as JSON
    upload.single('image')(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 4 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload error' });
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const ext = MIME_TO_EXT[req.file.mimetype] || 'jpg';
    const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await storageClient.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: `Storage upload failed: ${error.message}` });
    }

    const { data: { publicUrl } } = storageClient.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    res.json({ url: publicUrl });
  }
);

module.exports = router;
