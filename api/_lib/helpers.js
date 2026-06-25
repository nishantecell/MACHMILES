import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handleCors = (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
};

const send = (res, status, success, message, data = null) => {
  const body = { success, message };
  if (data != null) body.data = data;
  return res.status(status).json(body);
};

export const ok       = (res, data, msg = 'Success')   => send(res, 200, true,  msg, data);
export const created  = (res, data, msg = 'Created')   => send(res, 201, true,  msg, data);
export const badReq   = (res, msg)                     => send(res, 400, false, msg);
export const unauth   = (res, msg = 'Unauthorized')    => send(res, 401, false, msg);
export const forbid   = (res, msg = 'Forbidden')       => send(res, 403, false, msg);
export const notFound = (res, msg = 'Not found')       => send(res, 404, false, msg);
export const err      = (res, msg = 'Server error')    => send(res, 500, false, msg);

export const authenticate = async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { unauth(res, 'No token provided'); return null; }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', decoded.userId).single();
    return { id: decoded.userId, email: decoded.email, ...(profile || {}) };
  } catch (e) {
    unauth(res, 'Invalid or expired token');
    return null;
  }
};

export const requireAdmin = (res, user) => {
  if (user?.role !== 'admin') { forbid(res, 'Admin access required'); return false; }
  return true;
};

export const resolveUserId = (req, user) => {
  if (user?.role === 'admin' && req.query?.view_as) return req.query.view_as;
  return user?.id;
};
