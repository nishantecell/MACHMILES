import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err, authenticate, requireAdmin } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAdmin(res, user)) return;

  const { id, action, dashboard } = req.query;

  try {
    // GET /admin/users?dashboard=true — overview stats
    if (req.method === 'GET' && dashboard === 'true') {
      const [
        { count: totalUsers },
        { count: proUsers },
        { count: premiumUsers },
        { count: totalApps },
        { data: recentUsers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'premium'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id, full_name, email, plan').limit(10),
      ]);
      return ok(res, {
        users: { total: totalUsers || 0, pro: proUsers || 0, premium: premiumUsers || 0, free: (totalUsers || 0) - (proUsers || 0) - (premiumUsers || 0) },
        applications: { total: totalApps || 0 },
        revenue: { total: 0, currency: 'INR' },
        recentUsers: recentUsers || [],
      });
    }

    // GET /admin/users?id=X&action=applications — get user's applications
    if (req.method === 'GET' && id && action === 'applications') {
      const { data, error } = await supabase
        .from('applications')
        .select('id, company, position, status, match_score, applied_at, job_url')
        .eq('user_id', id)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return ok(res, data || []);
    }

    // GET /admin/users?id=X — get single user profile
    if (req.method === 'GET' && id) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return ok(res, data);
    }

    // GET /admin/users — list all users with application counts + join date from auth
    if (req.method === 'GET') {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, plan, role');
      if (error) throw error;

      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authMap = {};
      (authData?.users || []).forEach(u => { authMap[u.id] = u.created_at; });

      const { data: appCounts } = await supabase.from('applications').select('user_id');
      const countMap = {};
      (appCounts || []).forEach(a => { countMap[a.user_id] = (countMap[a.user_id] || 0) + 1; });

      return ok(res, (profiles || []).map(p => ({
        ...p,
        created_at: authMap[p.id] || null,
        application_count: countMap[p.id] || 0,
      })));
    }

    // PUT /admin/users?id=X — update user plan/role/status
    if (req.method === 'PUT' && id) {
      const allowed = ['plan', 'role', 'full_name', 'phone', 'status'];
      const updates = {};
      allowed.forEach(f => { if (req.body?.[f] !== undefined) updates[f] = req.body[f]; });
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;

      // Sync ban state to Supabase Auth
      if (updates.status === 'blocked') {
        await supabase.auth.admin.updateUserById(id, { ban_duration: '87600h' });
      } else if (updates.status === 'active') {
        await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' });
      }

      return ok(res, data, 'User updated');
    }

    // DELETE /admin/users?id=X — permanently delete user
    if (req.method === 'DELETE' && id) {
      await supabase.from('profiles').delete().eq('id', id);
      const { error: authDelErr } = await supabase.auth.admin.deleteUser(id);
      if (authDelErr) console.error('Auth delete failed for', id, authDelErr.message);
      return ok(res, null, 'User deleted');
    }

    return badReq(res, 'Invalid request');
  } catch (e) {
    console.error('Admin users error:', e.message);
    return err(res, e.message || 'Failed');
  }
}
