// api/payments/verify.js
const crypto   = require('crypto');
const supabase = require('../_lib/supabase');
const { handleCors, ok, badReq, err, authenticate } = require('../_lib/helpers');

const PLANS = {
  pro:     { amount: 59900,  days: 30 },
  premium: { amount: 99900,  days: 30 },
};

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const user = await authenticate(req, res);
  if (!user) return;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return badReq(res, 'Missing payment verification fields');
  }
  if (!PLANS[plan]) return badReq(res, 'Invalid plan');

  // Verify Razorpay signature
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return badReq(res, 'Payment verification failed — invalid signature');
  }

  try {
    const startsAt  = new Date().toISOString();
    const expiresAt = new Date(Date.now() + PLANS[plan].days * 24 * 60 * 60 * 1000).toISOString();

    // Save subscription
    await supabase.from('subscriptions').insert({
      user_id:            user.id,
      plan,
      status:             'active',
      amount:             PLANS[plan].amount / 100,
      currency:           'INR',
      payment_gateway:    'razorpay',
      gateway_order_id:   razorpay_order_id,
      gateway_payment_id: razorpay_payment_id,
      gateway_signature:  razorpay_signature,
      starts_at:          startsAt,
      expires_at:         expiresAt,
    });

    // Upgrade user plan
    await supabase.from('users')
      .update({ plan, plan_expires_at: expiresAt })
      .eq('id', user.id);

    return ok(res, { plan, expires_at: expiresAt }, 'Payment successful! Plan upgraded.');
  } catch (e) {
    console.error('Verify payment error:', e);
    return err(res, 'Failed to process payment');
  }
};
