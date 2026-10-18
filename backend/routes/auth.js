// Authentication routes - handles user signup, login, and profile
const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const {
  sendEmail,
  buildWelcomeEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
} = require('../utils/email');
const {
  hashToken,
  issueEmailToken,
  markEmailTokenSent,
  invalidateEmailToken,
  invalidateUserEmailTokens,
} = require('../utils/emailAuthTokens');

function normalizeAddressInput(address) {
  if (!address) return null;

  if (typeof address === 'string') {
    const trimmed = String(address).trim();
    return trimmed ? { street: trimmed, street2: '', city: '', state: '', zip: '', country: 'US' } : null;
  }

  const normalized = {
    street: String(address.street || address.address1 || '').trim(),
    street2: String(address.street2 || address.address2 || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim(),
    zip: String(address.zip || address.zip_code || '').trim(),
    country: String(address.country || 'US').trim() || 'US'
  };

  return normalized;
}

function buildUserAddressPayload({ billing_address, mailing_address } = {}) {
  const payload = {};
  const billing = normalizeAddressInput(billing_address);
  const mailing = normalizeAddressInput(mailing_address);

  if (billing && (billing.street || billing.city || billing.state || billing.zip)) {
    payload.billing_address = billing;
  }

  if (mailing && (mailing.street || mailing.city || mailing.state || mailing.zip)) {
    payload.mailing_address = mailing;
  }

  return payload;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeIlikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

// HELPER: Generate a JWT login token for a user
function generateToken(userId, rememberMe = false) {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '24h' }
  );
}

// HELPER: Verify a JWT token from an incoming request
function verifyToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

async function sendAccountTokenEmail(user, purpose, returnTo = '/account') {
  const issued = await issueEmailToken(user.id, purpose);
  if (!issued) return false;

  try {
    const message = purpose === 'email_verification'
      ? buildVerificationEmail(user.name, issued.token, safeReturnPath(returnTo), user.email)
      : buildPasswordResetEmail(user.name, issued.token, safeReturnPath(returnTo));
    await sendEmail({ to: user.email, ...message });
    await markEmailTokenSent(issued.id);
    return true;
  } catch (error) {
    try {
      await invalidateEmailToken(issued.id);
    } catch (invalidateError) {
      console.error('Failed to invalidate undelivered account email token:', invalidateError.message);
    }
    throw error;
  }
}

function validOpaqueToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

function safeReturnPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/account';
}

// -------------------------------------------------------
// ENDPOINT 1: Register (Create New Account)
// POST /api/auth/register
// -------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  try {
    const {
      email: submittedEmail,
      password,
      name,
      phone_number,
      billing_address,
      mailing_address,
      next,
    } = req.body;
    const email = normalizeEmail(submittedEmail);

    if (!isValidEmail(email) || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', escapeIlikePattern(email))
      .maybeSingle();

    if (existingError) {
      console.error('Existing user lookup failed:', existingError);
      return res.status(500).json({ error: 'Unable to validate email' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userPayload = {
      email,
      password_hash: hashedPassword,
      name,
      ...(phone_number ? { phone_number } : {}),
      ...buildUserAddressPayload({ billing_address, mailing_address }),
    };

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userPayload])
      .select();

    if (insertError) {
      console.error('Register insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    let verificationEmailSent = false;
    try {
      verificationEmailSent = await sendAccountTokenEmail(newUser[0], 'email_verification', next);
    } catch (emailError) {
      console.error('Email verification message could not be sent:', emailError.message);
    }

    res.status(201).json({
      user_id: newUser[0].id,
      email_verification_required: true,
      email_sent: verificationEmailSent,
      message: verificationEmailSent
        ? 'Account created. Check your email to verify your address.'
        : 'Account created, but the verification email could not be sent. Request another verification email to continue.',
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Login
// POST /api/auth/login
// -------------------------------------------------------
router.post('/auth/login', async (req, res) => {
  try {
    const { password, rememberMe, next } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', escapeIlikePattern(email))
      .maybeSingle();

    if (selectError || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.email_verified_at) {
      try {
        await sendAccountTokenEmail(user, 'email_verification', next);
      } catch (emailError) {
        console.error('Login verification email could not be sent:', emailError.message);
      }
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Verify your email address before signing in. Request a verification link if you need another one.',
      });
    }

    const token = generateToken(user.id, rememberMe);

    res.status(200).json({
      user_id: user.id,
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/auth/email/verification/resend', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const next = safeReturnPath(req.body?.next);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, email_verified_at')
      .ilike('email', escapeIlikePattern(email))
      .maybeSingle();
    if (error) throw new Error(`Unable to look up verification account: ${error.message}`);

    if (user && !user.email_verified_at) {
      try {
        await sendAccountTokenEmail(user, 'email_verification', next);
      } catch (emailError) {
        console.error('Verification resend failed:', emailError.message);
      }
    }
    res.status(200).json({ message: 'If the account can receive a verification email, a new link will be sent shortly.' });
  } catch (error) {
    console.error('Verification resend request failed:', error.message);
    res.status(500).json({ error: 'Unable to process the verification request. Please try again.' });
  }
});

router.post('/auth/email/verify', async (req, res) => {
  const { token } = req.body || {};
  if (!validOpaqueToken(token)) {
    return res.status(400).json({ error: 'This verification link is invalid or expired. Request a new one.' });
  }

  try {
    const { data: userId, error } = await supabase.rpc('verify_user_email', {
      p_token_hash: hashToken(token),
    });
    if (error) throw new Error(`Unable to verify email address: ${error.message}`);
    if (!userId) {
      return res.status(400).json({ error: 'This verification link has expired or was already used. Request a new one.' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();
    if (userError || !user) throw new Error(`Verified account could not be loaded: ${userError?.message || 'User not found'}`);

    try {
      await sendEmail({ to: user.email, ...buildWelcomeEmail(user.name) });
    } catch (emailError) {
      console.error('Welcome email delivery failed after email verification:', emailError.message);
    }
    res.status(200).json({
      token: generateToken(userId),
      message: 'Email verified successfully.',
    });
  } catch (error) {
    console.error('Email verification failed:', error.message);
    res.status(500).json({ error: 'Unable to verify your email right now. Please try again.' });
  }
});

router.post('/auth/password-reset/request', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const next = safeReturnPath(req.body?.next);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .ilike('email', escapeIlikePattern(email))
      .maybeSingle();
    if (error) throw new Error(`Unable to look up password reset account: ${error.message}`);

    if (user) {
      try {
        await sendAccountTokenEmail(user, 'password_reset', next);
      } catch (emailError) {
        console.error('Password reset email could not be sent:', emailError.message);
      }
    }
    res.status(200).json({ message: 'If an account exists for that email, password reset instructions will be sent shortly.' });
  } catch (error) {
    console.error('Password reset request failed:', error.message);
    res.status(500).json({ error: 'Unable to process the password reset request. Please try again.' });
  }
});

router.post('/auth/password-reset/complete', async (req, res) => {
  const { token, password } = req.body || {};
  if (!validOpaqueToken(token) || typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Use a valid reset link and a password of at least 6 characters.' });
  }

  try {
    const passwordHash = await bcryptjs.hash(password, 10);
    const { data: userId, error } = await supabase.rpc('reset_user_password', {
      p_token_hash: hashToken(token),
      p_password_hash: passwordHash,
    });
    if (error) throw new Error(`Unable to reset password: ${error.message}`);
    if (!userId) {
      return res.status(400).json({ error: 'This reset link has expired or was already used. Request a new one.' });
    }
    res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('Password reset failed:', error.message);
    res.status(500).json({ error: 'Unable to reset the password right now. Please try again.' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Get Current User Info
// GET /api/auth/me
// -------------------------------------------------------
router.get('/auth/me', async (req, res) => {
  try {
    const userId = verifyToken(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - invalid or missing token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone_number, billing_address, mailing_address, created_at, email_verified_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error getting user info' });
  }
});

// -------------------------------------------------------
// ENDPOINT 4: Update Current User Profile
// PUT /api/auth/profile
// -------------------------------------------------------
router.put('/auth/profile', async (req, res) => {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - invalid or missing token' });
    }

    const {
      name,
      phone_number,
      billing_address,
      mailing_address,
      password,
      email: submittedEmail,
      current_password,
    } = req.body;

    const updatePayload = {
      ...(name ? { name } : {}),
      ...(phone_number !== undefined ? { phone_number } : {}),
      ...buildUserAddressPayload({ billing_address, mailing_address }),
    };

    if (submittedEmail !== undefined) {
      const email = normalizeEmail(submittedEmail);
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('id, email, password_hash')
        .eq('id', userId)
        .single();

      if (currentUserError) {
        console.error('Profile email lookup failed:', currentUserError);
        return res.status(500).json({ error: 'Unable to verify account credentials.' });
      }
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (email !== normalizeEmail(currentUser.email)) {
        if (typeof current_password !== 'string' || !current_password) {
          return res.status(400).json({ error: 'Enter your current password to change your email.' });
        }

        const passwordMatch = await bcryptjs.compare(current_password, currentUser.password_hash);
        if (!passwordMatch) {
          return res.status(403).json({ error: 'Current password is incorrect.' });
        }

        const { data: existingUser, error: existingError } = await supabase
          .from('users')
          .select('id')
          .ilike('email', escapeIlikePattern(email))
          .neq('id', userId)
          .maybeSingle();

        if (existingError) {
          console.error('Email availability lookup failed:', existingError);
          return res.status(500).json({ error: 'Unable to validate email address.' });
        }
        if (existingUser) {
          return res.status(409).json({ error: 'That email address is already in use.' });
        }

        await invalidateUserEmailTokens(userId, 'email_verification');
        updatePayload.email = email;
        updatePayload.email_verified_at = null;
      }
    }

    if (password) {
      updatePayload.password_hash = await bcryptjs.hash(password, 10);
    }

    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({ error: 'No profile changes were provided.' });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, email, name, phone_number, billing_address, mailing_address, created_at, email_verified_at')
      .single();

    if (updateError || !updatedUser) {
      console.error('Profile update error:', updateError);
      if (updateError?.code === '23505' && updatePayload.email) {
        return res.status(409).json({ error: 'That email address is already in use.' });
      }
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    if (updatePayload.email) {
      let emailSent = false;
      try {
        emailSent = await sendAccountTokenEmail(updatedUser, 'email_verification');
      } catch (emailError) {
        console.error('Profile email verification message could not be sent:', emailError.message);
      }
      return res.status(200).json({
        ...updatedUser,
        email_verification_required: true,
        email_sent: emailSent,
      });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

module.exports = router;
module.exports.normalizeAddressInput = normalizeAddressInput;
module.exports.buildUserAddressPayload = buildUserAddressPayload;
module.exports.normalizeEmail = normalizeEmail;
module.exports.isValidEmail = isValidEmail;
module.exports.safeReturnPath = safeReturnPath;
