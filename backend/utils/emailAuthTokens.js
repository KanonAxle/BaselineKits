const { createHash, randomBytes } = require('node:crypto');
const supabase = require('../config/supabase');

const TOKEN_TTL_MS = {
  email_verification: 24 * 60 * 60 * 1000,
  password_reset: 30 * 60 * 1000,
};
const MAX_EMAILS_PER_DAY = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function canSendToken(userId, purpose) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('auth_email_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .not('sent_at', 'is', null)
    .gte('created_at', since);

  if (error) throw new Error(`Unable to check email token rate limit: ${error.message}`);
  if ((count || 0) >= MAX_EMAILS_PER_DAY) return false;

  const recentSince = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
  const { count: recentCount, error: recentError } = await supabase
    .from('auth_email_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .not('sent_at', 'is', null)
    .gte('created_at', recentSince);

  if (recentError) throw new Error(`Unable to check email resend cooldown: ${recentError.message}`);
  return (recentCount || 0) === 0;
}

async function issueEmailToken(userId, purpose) {
  const ttl = TOKEN_TTL_MS[purpose];
  if (!ttl) throw new Error('Unsupported email token purpose');
  if (!await canSendToken(userId, purpose)) return null;

  const now = new Date().toISOString();
  const { error: invalidateError } = await supabase
    .from('auth_email_tokens')
    .update({ consumed_at: now })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .is('consumed_at', null);
  if (invalidateError) throw new Error(`Unable to expire previous email tokens: ${invalidateError.message}`);

  const token = randomBytes(32).toString('hex');
  const { data, error } = await supabase
    .from('auth_email_tokens')
    .insert({
      user_id: userId,
      purpose,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + ttl).toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Unable to create email token: ${error?.message || 'Token record was not returned'}`);

  return { id: data.id, token };
}

async function markEmailTokenSent(id) {
  const { error } = await supabase
    .from('auth_email_tokens')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Unable to record email token delivery: ${error.message}`);
}

async function invalidateEmailToken(id) {
  const { error } = await supabase
    .from('auth_email_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', id)
    .is('consumed_at', null);
  if (error) throw new Error(`Unable to invalidate unsent email token: ${error.message}`);
}

async function invalidateUserEmailTokens(userId, purpose) {
  const { error } = await supabase
    .from('auth_email_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .is('consumed_at', null);
  if (error) throw new Error(`Unable to invalidate existing email tokens: ${error.message}`);
}

module.exports = { hashToken, issueEmailToken, markEmailTokenSent, invalidateEmailToken, invalidateUserEmailTokens };
