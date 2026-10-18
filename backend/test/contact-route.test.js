const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const contactRouter = require('../routes/contact');

test('contact endpoint validates messages and sends them to the configured inbox', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', contactRouter);
  const server = app.listen(0);
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousContactEmail = process.env.CONTACT_EMAIL;
  const previousFetch = global.fetch;
  const nativeFetch = global.fetch;
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.CONTACT_EMAIL = 'info@baselinekits.com';
  let sentEmail;

  global.fetch = async (url, options) => {
    sentEmail = { url, options };
    return { ok: true, json: async () => ({ id: 'email-1' }) };
  };

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/contact`;
    const invalidResponse = await nativeFetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'invalid', reason: '', message: '' }),
    });
    assert.equal(invalidResponse.status, 400);
    assert.equal(sentEmail, undefined);

    const response = await nativeFetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer',
        email: 'customer@example.com',
        reason: 'Order Issue',
        message: 'Please help with my order.',
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(sentEmail.url, 'https://api.resend.com/emails');
    assert.deepEqual(JSON.parse(sentEmail.options.body), {
      from: 'BaselineKits <info@baselinekits.com>',
      to: ['info@baselinekits.com'],
      subject: 'Website contact — Order Issue',
      text: 'From: Customer\nEmail: customer@example.com\nTopic: Order Issue\n\nPlease help with my order.',
      reply_to: 'customer@example.com',
    });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousContactEmail === undefined) delete process.env.CONTACT_EMAIL;
    else process.env.CONTACT_EMAIL = previousContactEmail;
  }
});
