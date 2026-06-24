import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendWelcomeEmail(email, name) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'AutoApply AI <noreply@machmiles.com>',
        to: email,
        subject: 'Welcome to AutoApply AI 🚀',
        html: `
          <div style="font-family:Inter,sans-serif;background:#020817;color:#fff;padding:40px;max-width:560px;margin:0 auto;border-radius:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
              <div style="width:40px;height:40px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px">A</div>
              <span style="font-weight:700;font-size:18px">AutoApply <span style="color:#3B82F6">AI</span></span>
            </div>
            <h1 style="font-size:28px;font-weight:800;margin:0 0 12px">Welcome, ${name}! 🎉</h1>
            <p style="color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 24px">Your AI-powered job search is now active. Here's how to get started:</p>
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:24px">
              <div style="display:flex;gap:12px;margin-bottom:12px"><span style="color:#3B82F6;font-weight:700">1.</span><span>Upload your resume — our AI will extract your skills automatically</span></div>
              <div style="display:flex;gap:12px;margin-bottom:12px"><span style="color:#3B82F6;font-weight:700">2.</span><span>Set your job preferences — title, location, salary</span></div>
              <div style="display:flex;gap:12px"><span style="color:#3B82F6;font-weight:700">3.</span><span>Turn on Auto Apply and let AI work for you 24/7</span></div>
            </div>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">© 2026 AutoApply AI · You're receiving this because you signed up.</p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return badReq(res, 'Name, email and password are required');
  if (password.length < 6) return badReq(res, 'Password must be at least 6 characters');

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim() },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }
      throw error;
    }

    const cleanedPhone = (phone || '').replace(/\D/g, '');
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanedPhone || null,
      plan: 'free',
      onboarded: false,
    });

    sendWelcomeEmail(email.trim().toLowerCase(), name.trim());

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: { userId: data.user.id, email: data.user.email },
    });
  } catch (e) {
    console.error('Register error:', e.message);
    return err(res, e.message);
  }
}
