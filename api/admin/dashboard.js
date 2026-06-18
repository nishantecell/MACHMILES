// api/admin/dashboard.js
const supabase = require('../_lib/supabase');
const { handleCors, ok, err, authenticate, requireAdmin } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return;

  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAdmin(res, user)) return;

  try {
    const [
      { count: totalUsers },
      { count: proUsers },
      { count: premiumUsers },
      { count: totalApps },
      { data: recentUsers },
      { data: subscriptions },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('plan', 'premium'),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('id, name, email, plan, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('subscriptions').select('amount').eq('status', 'active'),
    ]);

    const revenue = subscriptions?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

    return ok(res, {
      users:        { total: totalUsers, pro: proUsers, premium: premiumUsers },
      applications: { total: totalApps },
      revenue:      { total: revenue, currency: 'INR' },
      recentUsers,
    });
  } catch (e) {
    console.error('Admin dashboard error:', e);
    return err(res, 'Failed to fetch dashboard');
  }
};
