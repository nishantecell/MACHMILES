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
        html: `<div style="font-family:Inter,sans-serif;background:#020817;color:#fff;padding:40px;max-width:560px;margin:0 auto;border-radius:16px"><h1 style="font-size:28px;font-weight:800;margin:0 0 12px">Welcome, ${name}! 🎉</h1><p style="color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 24px">Your AI-powered job search is now active.</p><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">© 2026 AutoApply AI</p></div>`,
      }),
    });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}

async function sendOtpSms(phone, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    // Dev mode: log OTP to console
    console.log(`[DEV] OTP for +91${phone}: ${otp}`);
    return;
  }
  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: apiKey },
    body: JSON.stringify({ route: 'otp', variables_values: otp, numbers: phone, flash: 0 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.return === false) throw new Error(Array.isArray(data.message) ? data.message[0] : (data.message || 'SMS send failed'));
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { action, phone, otp, name, email, password } = req.body || {};

  // --- Send OTP ---
  if (action === 'send_otp') {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.length !== 10) return badReq(res, 'Enter a valid 10-digit Indian mobile number');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: dbErr } = await supabase
      .from('phone_otps')
      .upsert({ phone: cleaned, otp: code, expires_at: expiresAt }, { onConflict: 'phone' });
    if (dbErr) return err(res, 'Could not generate OTP');
    try { await sendOtpSms(cleaned, code); } catch (e) { return err(res, e.message); }
    return ok(res, null, 'OTP sent successfully');
  }

  // --- Verify OTP ---
  if (action === 'verify_otp') {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (!cleaned || !otp) return badReq(res, 'Phone and OTP are required');
    const { data: record } = await supabase.from('phone_otps').select('otp, expires_at').eq('phone', cleaned).single();
    if (!record) return badReq(res, 'OTP not found. Please request a new one.');
    if (new Date(record.expires_at) < new Date()) return badReq(res, 'OTP expired. Please request a new one.');
    if (record.otp !== String(otp)) return badReq(res, 'Invalid OTP. Please try again.');
    await supabase.from('phone_otps').delete().eq('phone', cleaned);
    return ok(res, null, 'Phone verified successfully');
  }

  // --- Register ---
  if (!name || !email || !password) return badReq(res, 'Name, email and password are required');
  if (password.length < 6) return badReq(res, 'Password must be at least 6 characters');
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(), password, email_confirm: true,
      user_metadata: { full_name: name.trim() },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered'))
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      throw error;
    }
    const cleanedPhone = (phone || '').replace(/\D/g, '');
    await supabase.from('profiles').upsert({
      id: data.user.id, full_name: name.trim(),
      email: email.trim().toLowerCase(), phone: cleanedPhone || null, plan: 'free', onboarded: false,
    });
    await sendWelcomeEmail(email.trim().toLowerCase(), name.trim());
    return res.status(201).json({ success: true, message: 'Account created successfully!', data: { userId: data.user.id, email: data.user.email } });
  } catch (e) {
    console.error('Register error:', e.message);
    return err(res, e.message);
  }
}
