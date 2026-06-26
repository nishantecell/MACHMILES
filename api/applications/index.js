import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, created, badReq, err, authenticate, resolveUserId } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await authenticate(req, res);
  if (!user) return;

  const userId = resolveUserId(req, user);

  try {
    if (req.method === 'GET') {
      const { status, search, page = 1, limit = 20 } = req.query;
      const from = (parseInt(page) - 1) * parseInt(limit);
      const to   = from + parseInt(limit) - 1;

      let query = supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })
        .range(from, to);

      if (status) query = query.eq('status', status);
      if (search) query = query.or(`company.ilike.%${search}%,position.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      return ok(res, {
        applications: data,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
      });
    }

    if (req.method === 'POST') {
      const { company, position, job_url, status = 'applied', match_score, cover_letter, notes, resume_id } = req.body || {};
      if (!company || !position) return badReq(res, 'Company and position are required');

      const { data: dup } = await supabase
        .from('applications').select('id')
        .eq('user_id', userId).eq('company', company).eq('position', position).single();
      if (dup) return badReq(res, 'You already applied to this position at this company');

      const { data, error } = await supabase
        .from('applications')
        .insert({ user_id: userId, company, position, job_url, status, match_score, cover_letter, notes, resume_id, applied_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      return created(res, data, 'Application added');
    }

    return badReq(res, 'Method not allowed');
  } catch (e) {
    console.error('Applications error:', e.message);
    return err(res, 'Request failed');
  }
}
