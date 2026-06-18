// api/auth/register.js
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

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  try {
    // Use Supabase built-in auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // auto-confirm so they can login immediately
      user_metadata: { full_name: name.trim() },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }
      throw error;
    }

    // Create profile record
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      plan: 'free',
      onboarded: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: { userId: data.user.id, email: data.user.email },
    });
  } catch (e) {
    console.error('Register error:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
}
