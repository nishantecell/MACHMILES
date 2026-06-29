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
    const { promo_code } = req.body;
    const plan = (req.body.plan || '').toLowerCase().trim();
    if (!PLANS[plan]) return badReq(res, `Invalid plan "${plan}". Choose: pro or premium`);

    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return err(res, `Payment gateway not configured. KEY_ID present: ${!!process.env.RAZORPAY_KEY_ID}, SECRET present: ${!!process.env.RAZORPAY_KEY_SECRET}`);
      }
      // Debug: show which key is being used (first 16 chars only)
      console.log('Using Razorpay KEY_ID:', process.env.RAZORPAY_KEY_ID?.slice(0, 16));
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

      const receipt = `mm_${user.id.replace(/-/g, '').slice(0, 20)}_${Date.now().toString().slice(-8)}`;
      const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt,
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
      console.error('Create order error:', e.message, e.statusCode, JSON.stringify(e.error));
      const detail = e.error?.description || e.error?.field || e.message || 'Unknown error';
      const code = e.statusCode || e.error?.code || '';
      const keyHint = process.env.RAZORPAY_KEY_ID?.slice(0, 16) || 'missing';
      return err(res, `Payment error [${code}]: ${detail} (key: ${keyHint})`);
    }
  }

  // --- Verify Payment ---
  if (action === 'verify') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const plan = (req.body.plan || '').toLowerCase().trim();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return badReq(res, 'Missing payment verification fields');
    if (!PLANS[plan]) return badReq(res, `Invalid plan "${plan}"`);

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
