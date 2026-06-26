import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendWelcomeEmail(email, name) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name.split(' ')[0];
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to AutoApply AI</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#3B82F6,#8B5CF6);padding:40px 40px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px">AutoApply AI</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px">by MACHMILES</p>
  </div>
  <div style="padding:40px">
    <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hi <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Welcome to <strong>AutoApply AI</strong>! 👋</p>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7">We're excited to have you join thousands of job seekers who are making their job search faster, smarter, and more efficient with AI.</p>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7">Searching and applying for jobs can be time-consuming, but it doesn't have to be. Our AI is designed to help you discover relevant opportunities and apply to multiple jobs in just a few clicks—so you can spend less time applying and more time preparing for interviews.</p>

    <div style="background:#f8fafc;border-left:4px solid #3B82F6;border-radius:8px;padding:24px;margin:28px 0">
      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b">Here's what you can do next:</p>
      <p style="margin:0 0 10px;font-size:14px;color:#475569">✅ Complete your profile</p>
      <p style="margin:0 0 10px;font-size:14px;color:#475569">✅ Upload your latest resume</p>
      <p style="margin:0 0 10px;font-size:14px;color:#475569">✅ Set your job preferences</p>
      <p style="margin:0;font-size:14px;color:#475569">✅ Let our AI start finding and applying to matching opportunities on your behalf</p>
    </div>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6">The more complete your profile, the better our AI can match you with the right roles.</p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px">

    <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b">Want to maximize your job search?</p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7">Our <strong>Premium Plan</strong> unlocks the full power of AI, including:</p>
    <div style="background:#faf5ff;border-radius:10px;padding:20px 24px;margin:0 0 20px">
      <p style="margin:0 0 8px;font-size:14px;color:#4c1d95">• Unlimited AI-powered job applications</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4c1d95">• Priority application processing</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4c1d95">• Smart job matching with higher accuracy</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4c1d95">• Advanced resume optimization</p>
      <p style="margin:0;font-size:14px;color:#4c1d95">• Early access to new features</p>
    </div>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Many of our users upgrade when they're actively job hunting because it allows them to apply consistently without spending hours every day.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">There's absolutely no rush—you can explore the platform first and upgrade whenever you're ready.</p>
    <div style="text-align:center;margin:0 0 32px">
      <a href="https://machmiles.com/Pricing" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px">👉 Upgrade whenever you're ready</a>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px">

    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7">Your next opportunity could be just one application away.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">If you ever have questions or need assistance, simply reply to this email. Our team is always happy to help.</p>
    <p style="margin:0 0 4px;font-size:14px;color:#475569">We wish you the very best in your job search and look forward to being part of your career journey.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569">Warm regards,<br><strong>AutoApply AI by MACHMILES</strong></p>
    <p style="margin:0;font-size:13px;color:#94a3b8;font-style:italic">Helping you land your next opportunity—powered by AI.</p>
  </div>
  <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="margin:0;font-size:12px;color:#94a3b8">© 2026 AutoApply AI by MACHMILES · <a href="https://machmiles.com" style="color:#3B82F6;text-decoration:none">machmiles.com</a></p>
  </div>
</div>
</body></html>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'AutoApply AI <noreply@machmiles.com>',
        to: email,
        subject: `Welcome to AutoApply AI, ${firstName}! 🚀`,
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
