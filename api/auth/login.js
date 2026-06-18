// api/auth/login.js
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../_lib/supabase');
const { handleCors, ok, badReq, unauth, forbid, err, validate } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { email, password } = req.body || {};

  const errors = validate({ email, password }, {
    email:    { required: true, isEmail: true },
    password: { required: true },
  });
  if (errors.length) return badReq(res, 'Validation failed', errors);

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, password_hash, role, plan, is_active, email_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) return unauth(res, 'Invalid email or password');
    if (!user.is_active) return forbid(res, 'Account deactivated. Contact support.');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return unauth(res, 'Invalid email or password');

    // Update last login
    await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token
    await supabase.from('refresh_tokens').insert({
      user_id:    user.id,
      token:      refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked:    false,
    });

    return ok(res, {
      user: {
        id:             user.id,
        name:           user.name,
        email:          user.email,
        role:           user.role,
        plan:           user.plan,
        email_verified: user.email_verified,
      },
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (e) {
    console.error('Login error:', e);
    return err(res, 'Login failed');
  }
};
