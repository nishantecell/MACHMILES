// api/_lib/helpers.js
// Shared utilities for all Vercel serverless functions

const jwt  = require('jsonwebtoken');
const supabase = require('./supabase');

// ─── CORS headers ────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin':  process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// ─── Handle CORS preflight ───────────────────────────────
const handleCors = (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
};

// ─── Response helpers ────────────────────────────────────
const send = (res, status, success, message, data = null, errors = null) => {
  const body = { success, message };
  if (data)   body.data   = data;
  if (errors) body.errors = errors;
  return res.status(status).json(body);
};

const ok      = (res, data, msg = 'Success')       => send(res, 200, true,  msg, data);
const created = (res, data, msg = 'Created')        => send(res, 201, true,  msg, data);
const badReq  = (res, msg, errors = null)           => send(res, 400, false, msg, null, errors);
const unauth  = (res, msg = 'Unauthorized')         => send(res, 401, false, msg);
const forbid  = (res, msg = 'Forbidden')            => send(res, 403, false, msg);
const notFound= (res, msg = 'Not found')            => send(res, 404, false, msg);
const conflict= (res, msg = 'Conflict')             => send(res, 409, false, msg);
const err     = (res, msg = 'Server error')         => send(res, 500, false, msg);

// ─── Auth middleware ─────────────────────────────────────
const authenticate = async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    unauth(res, 'No token provided');
    return null;
  }
  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, plan, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      unauth(res, 'User not found or deactivated');
      return null;
    }
    return user;
  } catch (e) {
    unauth(res, e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
    return null;
  }
};

// ─── Require admin ───────────────────────────────────────
const requireAdmin = (res, user) => {
  if (user?.role !== 'admin') {
    forbid(res, 'Admin access required');
    return false;
  }
  return true;
};

// ─── Simple validator ────────────────────────────────────
const validate = (body, rules) => {
  const errors = [];
  for (const [field, rule] of Object.entries(rules)) {
    const val = body[field];
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }
    if (val !== undefined && rule.minLength && String(val).length < rule.minLength) {
      errors.push({ field, message: `${field} must be at least ${rule.minLength} characters` });
    }
    if (val !== undefined && rule.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errors.push({ field, message: `${field} must be a valid email` });
    }
    if (val !== undefined && rule.isIn && !rule.isIn.includes(val)) {
      errors.push({ field, message: `${field} must be one of: ${rule.isIn.join(', ')}` });
    }
  }
  return errors;
};

module.exports = {
  handleCors, ok, created, badReq, unauth, forbid, notFound, conflict, err,
  authenticate, requireAdmin, validate,
};
