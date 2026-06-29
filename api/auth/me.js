// api/auth/me.js
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
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const [{ data: profile }, { data: authUserData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', decoded.userId).single(),
      supabase.auth.admin.getUserById(decoded.userId),
    ]);

    if (!profile) return res.status(404).json({ success: false, message: 'User not found' });

    const createdAt = authUserData?.user?.created_at;
    let onboarded = profile.onboarded;

    // Auto-fix: existing users (registered >30 min ago) who still have onboarded:false
    // due to the old broken API routing — mark them as onboarded in DB
    if (onboarded === false && createdAt) {
      const ageMs = Date.now() - new Date(createdAt).getTime();
      if (ageMs > 30 * 60 * 1000) {
        await supabase.from('profiles').update({ onboarded: true }).eq('id', decoded.userId);
        onboarded = true;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Success',
      data: { id: decoded.userId, email: decoded.email, created_at: createdAt, ...profile, onboarded },
    });
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
