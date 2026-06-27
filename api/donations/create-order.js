import Razorpay from 'razorpay';
import { handleCors, ok, badReq, err } from '../_lib/helpers.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { amount, name, email } = req.body || {};
  if (!name || !email) return badReq(res, 'Name and email are required');
  if (!amount || amount < 100) return badReq(res, 'Minimum donation amount is ₹100');

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `donation_${Date.now()}`,
      notes: { donor_name: name, donor_email: email, campaign: 'Venezuela Earthquake Relief' },
    });

    return ok(res, {
      order_id: order.id,
      amount: order.amount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error('Donation order error:', e.message);
    return err(res, 'Failed to create donation order');
  }
}
