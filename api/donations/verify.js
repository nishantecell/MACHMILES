import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendThankYouEmail(name, email, amount, paymentId, orderId) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name.split(' ')[0];
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thank You for Your Donation</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#DC2626,#1D4ED8);padding:40px 40px 32px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">🇻🇪</div>
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Venezuela Earthquake Relief</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Thank you for standing with the people of Venezuela</p>
  </div>
  <div style="padding:40px">
    <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Dear <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7">Thank you for your generous contribution towards the <strong>Venezuela Earthquake Relief Campaign</strong>. Your kindness makes a real difference.</p>
    <div style="background:#fef2f2;border-left:4px solid #DC2626;border-radius:8px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#991B1B">Your donation helps provide:</p>
      <p style="margin:0 0 8px;font-size:14px;color:#7f1d1d">🍽️ Emergency food for affected families</p>
      <p style="margin:0 0 8px;font-size:14px;color:#7f1d1d">💧 Clean drinking water</p>
      <p style="margin:0 0 8px;font-size:14px;color:#7f1d1d">🏕️ Temporary shelter and relief materials</p>
      <p style="margin:0 0 8px;font-size:14px;color:#7f1d1d">💊 Medical assistance and healthcare</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d">🏗️ Recovery and rebuilding support</p>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b">Donation Details</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:40%">Name</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:600">${name}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Email</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:600">${email}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Amount</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:600">₹${amount.toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Transaction ID</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:600">${paymentId}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Date</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:600">${date}</td></tr>
      </table>
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7">Every donation brings hope to families affected by this disaster. Together, we rebuild lives.</p>
    <p style="margin:0 0 4px;font-size:14px;color:#475569">With deep gratitude,</p>
    <p style="margin:0;font-size:14px;color:#1e293b;font-weight:700">The Relief Team<br><span style="font-weight:400;color:#64748b">Venezuela Earthquake Relief Campaign</span></p>
  </div>
  <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="margin:0;font-size:12px;color:#94a3b8">This is an automated donation receipt. Please keep it for your records.</p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">© 2026 MACHMILES · <a href="https://machmiles.com" style="color:#3B82F6;text-decoration:none">machmiles.com</a></p>
  </div>
</div>
</body></html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Venezuela Relief <noreply@machmiles.com>',
        to: email,
        subject: `Thank You for Supporting Venezuela Earthquake Relief — ₹${amount.toLocaleString('en-IN')} Received`,
        html,
      }),
    });
  } catch (e) {
    console.error('Donation thank-you email failed:', e.message);
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, amount } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return badReq(res, 'Missing payment fields');
  if (!name || !email || !amount) return badReq(res, 'Missing donor details');

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) return badReq(res, 'Payment verification failed');

  try {
    await supabase.from('donations').insert({
      name,
      email,
      amount,
      razorpay_payment_id,
      razorpay_order_id,
      campaign: 'Venezuela Earthquake Relief',
      created_at: new Date().toISOString(),
    });

    await sendThankYouEmail(name, email, amount, razorpay_payment_id, razorpay_order_id);

    return ok(res, { payment_id: razorpay_payment_id }, 'Donation verified. Thank you!');
  } catch (e) {
    console.error('Donation verify error:', e.message);
    return err(res, 'Failed to process donation');
  }
}
