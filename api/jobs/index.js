import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, err } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return;

  const { search, is_remote, job_type, page = 1, limit = 20 } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;

  try {
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('posted_at', { ascending: false })
      .range(from, to);

    if (search)    query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
    if (is_remote) query = query.eq('is_remote', is_remote === 'true');
    if (job_type)  query = query.eq('job_type', job_type);

    const { data, error, count } = await query;
    if (error) throw error;

    return ok(res, {
      jobs: data || [],
      pagination: { total: count || 0, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil((count || 0) / limit) },
    });
  } catch (e) {
    console.error('Jobs error:', e);
    return err(res, 'Failed to fetch jobs');
  }
}
