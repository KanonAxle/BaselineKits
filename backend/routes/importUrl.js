const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const requireAdmin = require('../middleware/requireAdmin');

// ── Helpers ────────────────────────────────────────────────────────────────

// Extract the first matching <meta> tag content
function getMeta($ , property) {
  let val = null;
  $(`meta[property="${property}"], meta[name="${property}"]`).each((_, el) => {
    if (!val) val = $(el).attr('content');
  });
  return val ? val.trim() : null;
}

// Find a JSON-LD block with @type === 'Product'
function extractJsonLd($) {
  let found = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      let data = JSON.parse($(el).html());
      // Handle @graph wrapper
      if (data['@graph']) {
        data = data['@graph'].find(
          item => item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))
        ) || null;
      }
      // Handle top-level array
      if (Array.isArray(data)) {
        data = data.find(
          item => item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))
        ) || null;
      }
      if (
        data &&
        (data['@type'] === 'Product' || (Array.isArray(data['@type']) && data['@type'].includes('Product')))
      ) {
        found = data;
      }
    } catch { /* malformed JSON-LD — skip */ }
  });
  return found;
}

// Clean HTML entities and tags out of a string
function cleanText(str) {
  if (!str) return null;
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Route ──────────────────────────────────────────────────────────────────

router.get('/admin/import-url', requireAdmin, async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'url parameter required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Could not fetch page: ${response.status} ${response.statusText}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const product = {};

    // ── 1. Try JSON-LD structured data ──────────────────────────────────────
    const jsonLd = extractJsonLd($);
    if (jsonLd) {
      product.name = cleanText(jsonLd.name) || null;
      product.description = cleanText(jsonLd.description) || null;

      // Brand
      if (jsonLd.brand) {
        product.brand = cleanText(typeof jsonLd.brand === 'string' ? jsonLd.brand : jsonLd.brand.name) || null;
      }

      // Price from offers
      const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
      if (offer?.price != null) {
        const parsed = parseFloat(String(offer.price).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) product.price_cents = Math.round(parsed * 100);
      }

      // Images
      if (jsonLd.image) {
        const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
        const urlList = imgs
          .map(img => (typeof img === 'string' ? img : img?.url || img?.contentUrl))
          .filter(Boolean);
        if (urlList.length) {
          product.images = urlList;
          product.image_url = urlList[0];
        }
      }
    }

    // ── 2. Fill gaps from Open Graph / meta tags ────────────────────────────
    if (!product.name) product.name = cleanText(getMeta($, 'og:title') || getMeta($, 'twitter:title') || $('title').first().text()) || null;
    if (!product.description) product.description = cleanText(getMeta($, 'og:description') || getMeta($, 'description') || getMeta($, 'twitter:description')) || null;
    if (!product.image_url) {
      const ogImg = getMeta($, 'og:image') || getMeta($, 'twitter:image');
      if (ogImg) { product.image_url = ogImg; product.images = [ogImg]; }
    }

    // ── 3. Clamp description length ─────────────────────────────────────────
    if (product.description && product.description.length > 1000) {
      product.description = product.description.slice(0, 997) + '...';
    }

    // ── 4. Source link ───────────────────────────────────────────────────────
    product.link = url;

    // Check we got at least a name
    if (!product.name) {
      return res.status(422).json({ error: 'Could not extract product data from this page. The site may block scrapers or use client-side rendering.' });
    }

    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

module.exports = router;
