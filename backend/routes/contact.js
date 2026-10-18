const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/email');

const CONTACT_REASONS = new Set([
  '',
  'Order Issue',
  'Product Question',
  'Kit Recommendation',
  'Returns & Exchanges',
  'Wholesale / Bulk Orders',
  'Other',
]);

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

router.post('/contact', async (req, res) => {
  const { name, email, reason, message } = req.body || {};
  if (
    typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
    !validEmail(email) ||
    typeof reason !== 'string' || !CONTACT_REASONS.has(reason) ||
    typeof message !== 'string' || !message.trim() || message.trim().length > 10000
  ) {
    return res.status(400).json({ error: 'Please provide a valid name, email, topic, and message.' });
  }

  try {
    await sendEmail({
      to: process.env.CONTACT_EMAIL || 'info@baselinekits.com',
      replyTo: email.trim(),
      subject: `Website contact${reason ? ` — ${reason}` : ''}`,
      text: [
        `From: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Topic: ${reason || 'Not selected'}`,
        '',
        message.trim(),
      ].join('\n'),
    });
    res.status(200).json({ message: 'Your message has been sent. We will be in touch soon.' });
  } catch (error) {
    if (error.name === 'EmailConfigurationError') {
      console.error('Contact form unavailable: Resend is not configured');
      return res.status(503).json({ error: 'The contact form is temporarily unavailable. Please email info@baselinekits.com.' });
    }
    console.error('Contact email delivery failed:', error.message);
    res.status(502).json({ error: 'We could not send your message. Please try again or email info@baselinekits.com.' });
  }
});

module.exports = router;
