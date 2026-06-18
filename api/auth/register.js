// api/auth/register.js
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const supabase = require('../_lib/supabase');
const { handleCors, ok, created, badReq, conflict, err, validate } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { name, email, password } = req.body || {};

  // Validate
  const errors = validate({ name, email, password }, {
    name:     { required: true, minLength: 2 },
    email:    { required: true, isEmail: true },
    password: { required: true, minLength: 8 },
  });
  if (errors.length) return badReq(res, 'Validation failed', errors);

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return badReq(res, 'Password must contain uppercase, lowercase, and a number');
  }

  try {
    // Check existing email
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email.toLowerCase()).single();
    if (existing) return conflict(res, 'An account with this email already exists');

    // Hash password
    const password_hash  = await bcrypt.hash(password, 12);
    const verify_token   = crypto.randomBytes(32).toString('hex');

    // Create user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ name, email: email.toLowerCase(), password_hash, verify_token, role: 'user', plan: 'free', is_active: true, email_verified: false })
      .select('id, email')
      .single();

    if (userErr) throw userErr;

    // Create profile
    await supabase.from('user_profiles').insert({ user_id: user.id });

    return created(res, { userId: user.id, email: user.email },
      'Account created! Please verify your email.');
  } catch (e) {
    console.error('Register error:', e);
    return err(res, 'Registration failed');
  }
};
