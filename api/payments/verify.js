import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err, authenticate } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PLANS = {
  pro:     { amount: 59900, days: 30 },
  premium: { amount: 99900, days: 30 },
};

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const user = await authenticate(req, res);
  if (!user) return;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return badReq(res, 'Missing payment verification fields');
  if (!PLANS[plan]) return badReq(res, 'Invalid plan');

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) return badReq(res, 'Payment verification failed — invalid signature');

  try {
    const expiresAt = new Date(Date.now() + PLANS[plan].days * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('profiles')
      .update({ plan, plan_expires_at: expiresAt })
      .eq('id', user.id);

    return ok(res, { plan, expires_at: expiresAt }, 'Payment successful! Plan upgraded.');
  } catch (e) {
    console.error('Verify payment error:', e.message);
    return err(res, 'Failed to process payment');
  }
}
