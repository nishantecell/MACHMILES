// api/auth/login.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    // Use Supabase built-in auth to verify credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data?.user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = data.user;

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, plan, role, onboarded')
      .eq('id', user.id)
      .single();

    // Auto-fix: existing users (>30 min old) stuck with onboarded:false due to old broken API
    let onboarded = profile?.onboarded ?? false;
    if (onboarded === false && user.created_at) {
      const ageMs = Date.now() - new Date(user.created_at).getTime();
      if (ageMs > 30 * 60 * 1000) {
        // Fire-and-forget — don't block login response
        supabase.from('profiles').update({ onboarded: true }).eq('id', user.id).then(() => {}).catch(() => {});
        onboarded = true;
      }
    }

    // Generate our own JWT tokens for API auth
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: profile?.role || 'user' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id:         user.id,
          name:       profile?.full_name || user.user_metadata?.full_name || email.split('@')[0],
          email:      user.email,
          role:       profile?.role || 'user',
          plan:       profile?.plan || 'free',
          onboarded,
          created_at: user.created_at,
        },
        accessToken,
        refreshToken: accessToken,
      },
    });
  } catch (e) {
    console.error('Login error:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
}
