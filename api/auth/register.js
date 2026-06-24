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

async function sendOtpSms(phone, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn('FAST2SMS_API_KEY not set — OTP:', otp);
    return { ok: true };
  }
  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: apiKey },
    body: JSON.stringify({
      route: 'otp',
      variables_values: otp,
      numbers: phone,
      flash: 0,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.return === false) {
    throw new Error(data.message?.[0] || 'Failed to send OTP');
  }
  return data;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { action, phone, otp, name, email, password } = req.body || {};

  // --- Send OTP ---
  if (action === 'send_otp') {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.length !== 10) return badReq(res, 'Enter a valid 10-digit Indian mobile number');

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbErr } = await supabase
      .from('phone_otps')
      .upsert({ phone: cleaned, otp: code, expires_at: expiresAt }, { onConflict: 'phone' });
    if (dbErr) {
      console.error('OTP DB error:', dbErr.message);
      return err(res, 'Could not generate OTP');
    }

    try {
      await sendOtpSms(cleaned, code);
    } catch (e) {
      console.error('SMS error:', e.message);
      return err(res, 'Failed to send OTP via SMS');
    }

    return ok(res, null, 'OTP sent successfully');
  }

  // --- Verify OTP ---
  if (action === 'verify_otp') {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (!cleaned || !otp) return badReq(res, 'Phone and OTP are required');

    const { data: record, error: dbErr } = await supabase
      .from('phone_otps')
      .select('otp, expires_at')
      .eq('phone', cleaned)
      .single();

    if (dbErr || !record) return badReq(res, 'OTP not found. Please request a new one.');
    if (new Date(record.expires_at) < new Date()) return badReq(res, 'OTP has expired. Please request a new one.');
    if (record.otp !== String(otp)) return badReq(res, 'Invalid OTP. Please try again.');

    await supabase.from('phone_otps').delete().eq('phone', cleaned);

    return ok(res, null, 'Phone verified successfully');
  }

  // --- Regular Registration ---
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
