import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendWelcomeEmail(email, name) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name.split(' ')[0];
  const upgradeLink = 'https://machmiles.com/?upgrade=true';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Inter,Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:40px 40px 32px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px">MachMiles AI</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px">Helping you land your next opportunity — powered by AI</p>
    </div>

    <!-- Body -->
    <div style="padding:40px">
      <p style="margin:0 0 20px;font-size:16px;color:#1a1a2e">Hi <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e">Welcome to <strong>MachMiles AI</strong>! 👋</p>
      <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.7">We're excited to have you join thousands of job seekers who are making their job search faster, smarter, and more efficient with AI.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.7">Searching and applying for jobs can be time-consuming, but it doesn't have to be. Our AI is designed to help you discover relevant opportunities and apply to multiple jobs in just a few clicks — so you can spend less time applying and more time preparing for interviews.</p>

      <!-- Next Steps -->
      <div style="background:#f0f7ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:20px 24px;margin:0 0 28px">
        <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a1a2e">Here's what you can do next:</p>
        <p style="margin:0 0 8px;font-size:14px;color:#4a5568">✅ Complete your profile</p>
        <p style="margin:0 0 8px;font-size:14px;color:#4a5568">✅ Upload your latest resume</p>
        <p style="margin:0 0 8px;font-size:14px;color:#4a5568">✅ Set your job preferences</p>
        <p style="margin:0;font-size:14px;color:#4a5568">✅ Let our AI start finding and applying to matching opportunities on your behalf</p>
      </div>

      <p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.7">The more complete your profile, the better our AI can match you with the right roles.</p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px">

      <!-- Premium -->
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a2e">Want to maximize your job search?</p>
      <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.7">Our <strong>Premium Plan</strong> unlocks the full power of AI, including:</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4a5568">• Unlimited AI-powered job applications</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4a5568">• Priority application processing</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4a5568">• Smart job matching with higher accuracy</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4a5568">• Advanced resume optimization</p>
      <p style="margin:0 0 20px;font-size:14px;color:#4a5568">• Early access to new features</p>
      <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.7">Many of our users upgrade when they're actively job hunting because it allows them to apply consistently without spending hours every day. There's absolutely no rush — you can explore the platform first and upgrade whenever you're ready.</p>

      <div style="text-align:center;margin:0 0 28px">
        <a href="${upgradeLink}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px">👉 Upgrade whenever you're ready</a>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px">

      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.7">Your next opportunity could be just one application away.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.7">If you ever have questions or need assistance, simply reply to this email. Our team is always happy to help.</p>
      <p style="margin:0 0 4px;font-size:15px;color:#4a5568">Warm regards,</p>
      <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1a1a2e">AutoApply AI by MACHMILES</p>
      <p style="margin:0;font-size:13px;color:#718096;font-style:italic">Helping you land your next opportunity — powered by AI.</p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#a0aec0">© 2026 MachMiles AI. All rights reserved.</p>
      <p style="margin:6px 0 0;font-size:12px;color:#a0aec0">You're receiving this because you signed up at machmiles.com</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'AutoApply AI by MachMiles <noreply@machmiles.com>',
        to: email,
        subject: `Welcome to MachMiles AI, ${firstName}! 👋`,
        html,
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
  if (!res.ok || data.return === false) throw new Error(data.message?.[0] || 'SMS send failed');
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
    sendWelcomeEmail(email.trim().toLowerCase(), name.trim());
    return res.status(201).json({ success: true, message: 'Account created successfully!', data: { userId: data.user.id, email: data.user.email } });
  } catch (e) {
    console.error('Register error:', e.message);
    return err(res, e.message);
  }
}
