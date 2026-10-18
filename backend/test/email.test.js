const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EmailConfigurationError,
  sendEmail,
  buildWelcomeEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildOrderConfirmationEmail,
} = require('../utils/email');

test('sendEmail requires a Resend API key', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    await assert.rejects(
      sendEmail({ to: 'customer@example.com', subject: 'Test', text: 'Test' }),
      EmailConfigurationError,
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('sendEmail submits a plain-text transactional message to Resend', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.EMAIL_FROM = 'BaselineKits <info@baselinekits.com>';
  let request;

  try {
    const result = await sendEmail({
      to: 'customer@example.com',
      replyTo: 'reply@example.com',
      subject: 'Order confirmed',
      text: 'Your order is confirmed.',
      idempotencyKey: 'order-confirmation-order-1',
    }, async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: 'email-1' }) };
    });

    assert.equal(result.id, 'email-1');
    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.options.headers.Authorization, 'Bearer test-resend-key');
    assert.equal(request.options.headers['Idempotency-Key'], 'order-confirmation-order-1');
    assert.deepEqual(JSON.parse(request.options.body), {
      from: 'BaselineKits <info@baselinekits.com>',
      to: ['customer@example.com'],
      subject: 'Order confirmed',
      text: 'Your order is confirmed.',
      reply_to: 'reply@example.com',
    });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousFrom;
  }
});

test('sendEmail reports Resend delivery failures', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-resend-key';

  try {
    await assert.rejects(
      sendEmail({ to: 'customer@example.com', subject: 'Test', text: 'Test' }, async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Domain is not verified' }),
      })),
      /Domain is not verified/,
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('transactional email templates include account and order details', () => {
  const previousUrl = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = 'https://www.baselinekits.com,https://baselinekits.com';

  try {
    const welcome = buildWelcomeEmail('Taylor');
    assert.match(welcome.text, /Hi Taylor/);
    assert.match(welcome.text, /https:\/\/www\.baselinekits\.com\/account/);

    const verification = buildVerificationEmail('Taylor', 'secure-token', '/cart', 'taylor@example.com');
    const verificationLink = new URL(verification.text.match(/https:\/\/\S+/)[0]);
    assert.equal(verificationLink.pathname, '/verify-email');
    assert.equal(verificationLink.searchParams.get('token'), 'secure-token');
    assert.equal(verificationLink.searchParams.get('next'), '/cart');
    assert.equal(verificationLink.searchParams.get('email'), 'taylor@example.com');

    const reset = buildPasswordResetEmail('Taylor', 'reset-token', '/cart');
    const resetLink = new URL(reset.text.match(/https:\/\/\S+/)[0]);
    assert.equal(resetLink.pathname, '/reset-password');
    assert.equal(resetLink.searchParams.get('token'), 'reset-token');
    assert.equal(resetLink.searchParams.get('next'), '/cart');

    const confirmation = buildOrderConfirmationEmail({
      orderId: '12345678-1234-1234-1234-123456789012',
      items: [{ quantity: 2, product_name: 'Water Filter' }],
      totalCents: 12450,
    });
    assert.match(confirmation.subject, /12345678/);
    assert.match(confirmation.text, /2 × Water Filter/);
    assert.match(confirmation.text, /\$124\.50/);
    assert.match(confirmation.text, /\/track\?order_id=/);
  } finally {
    if (previousUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousUrl;
  }
});
