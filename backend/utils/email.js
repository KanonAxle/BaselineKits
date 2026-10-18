const DEFAULT_FROM = 'BaselineKits <info@baselinekits.com>';

class EmailConfigurationError extends Error {
  constructor() {
    super('Email delivery is not configured');
    this.name = 'EmailConfigurationError';
  }
}

async function sendEmail({ to, subject, text, replyTo, idempotencyKey }, fetchImpl = fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailConfigurationError();

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = result.message || result.error || `HTTP ${response.status}`;
    throw new Error(`Resend email request failed: ${reason}`);
  }
  return result;
}

function getSiteUrl() {
  const configuredUrls = (process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'https://www.baselinekits.com')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return (configuredUrls[0] || 'https://www.baselinekits.com').replace(/\/+$/, '');
}

function buildWelcomeEmail(name) {
  return {
    subject: 'Welcome to BaselineKits',
    text: [
      `Hi ${name},`,
      '',
      'Your BaselineKits account is ready. You can sign in to manage your account and view your orders.',
      '',
      `${getSiteUrl()}/account`,
      '',
      'Questions? Reply to this email or contact info@baselinekits.com.',
      '',
      '— BaselineKits',
    ].join('\n'),
  };
}

function buildVerificationEmail(name, token, returnTo = '/account', email = '') {
  const verificationUrl = new URL('/verify-email', getSiteUrl());
  verificationUrl.searchParams.set('token', token);
  verificationUrl.searchParams.set('next', returnTo);
  if (email) verificationUrl.searchParams.set('email', email);
  return {
    subject: 'Verify your BaselineKits email',
    text: [
      `Hi ${name},`,
      '',
      'Please verify this email address to activate your BaselineKits account:',
      verificationUrl.toString(),
      '',
      'This link expires in 24 hours. If you did not create this account, you can ignore this email.',
      '',
      '— BaselineKits',
    ].join('\n'),
  };
}

function buildPasswordResetEmail(name, token, returnTo = '/account') {
  const resetUrl = new URL('/reset-password', getSiteUrl());
  resetUrl.searchParams.set('token', token);
  resetUrl.searchParams.set('next', returnTo);
  return {
    subject: 'Reset your BaselineKits password',
    text: [
      `Hi ${name},`,
      '',
      'Use this link to choose a new password for your BaselineKits account:',
      resetUrl.toString(),
      '',
      'This link expires in 30 minutes. If you did not request a password reset, you can ignore this email.',
      '',
      '— BaselineKits',
    ].join('\n'),
  };
}

function buildOrderConfirmationEmail({ orderId, items, totalCents }) {
  const orderNumber = orderId.slice(0, 8).toUpperCase();
  const itemLines = items.length
    ? items.map(item => `- ${item.quantity} × ${item.product_name || item.products?.name || 'Item'}`).join('\n')
    : '- Your custom BaselineKits order';

  return {
    subject: `Order confirmed — ${orderNumber}`,
    text: [
      'Thank you for your order. Your payment was received and we are preparing it.',
      '',
      `Order number: ${orderNumber}`,
      '',
      'Items:',
      itemLines,
      '',
      `Total paid: $${(totalCents / 100).toFixed(2)}`,
      '',
      `Track your order: ${getSiteUrl()}/track?order_id=${encodeURIComponent(orderId)}`,
      '',
      'Questions? Contact info@baselinekits.com.',
      '',
      '— BaselineKits',
    ].join('\n'),
  };
}

module.exports = {
  EmailConfigurationError,
  sendEmail,
  buildWelcomeEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildOrderConfirmationEmail,
};
