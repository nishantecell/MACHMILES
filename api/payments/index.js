import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err, authenticate } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PLANS = {
  pro:     { amount: 59900, name: 'AutoApply AI Pro',     days: 30 },
  premium: { amount: 99900, name: 'AutoApply AI Premium', days: 30 },
};

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const user = await authenticate(req, res);
  if (!user) return;

  const { action } = req.body || {};

  // --- Create Order ---
  if (action === 'create-order') {
    const { plan, promo_code } = req.body;
    if (!PLANS[plan]) return badReq(res, 'Invalid plan. Choose: pro or premium');

    try {
      const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      let amount = PLANS[plan].amount;

      if (promo_code) {
        const { data: promo } = await supabase
          .from('promo_codes').select('*').eq('code', promo_code.toUpperCase()).eq('is_active', true).single();
        if (promo) {
          amount = promo.discount_type === 'percentage'
            ? Math.round(amount * (1 - promo.discount_value / 100))
            : Math.max(0, amount - promo.discount_value * 100);
        }
      }

      const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt:  `order_${user.id}_${Date.now()}`,
        notes:    { user_id: String(user.id), plan },
      });

      return ok(res, {
        order_id:  order.id,
        amount,
        currency:  'INR',
        key_id:    process.env.RAZORPAY_KEY_ID,
        plan_name: PLANS[plan].name,
        user:      { name: user.full_name, email: user.email },
      });
    } catch (e) {
      console.error('Create order error:', e.message);
      return err(res, 'Failed to create order');
    }
  }

  // --- Verify Payment ---
  if (action === 'verify') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return badReq(res, 'Missing payment verification fields');
    if (!PLANS[plan]) return badReq(res, 'Invalid plan');

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) return badReq(res, 'Payment verification failed — invalid signature');

    try {
      const expiresAt = new Date(Date.now() + PLANS[plan].days * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('profiles').update({ plan, plan_expires_at: expiresAt }).eq('id', user.id);
      return ok(res, { plan, expires_at: expiresAt }, 'Payment successful! Plan upgraded.');
    } catch (e) {
      console.error('Verify payment error:', e.message);
      return err(res, 'Failed to process payment');
    }
  }

  return badReq(res, 'Invalid action');
}
