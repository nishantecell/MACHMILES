// api/applications/stats.js
const supabase = require('../_lib/supabase');
const { handleCors, ok, err, authenticate } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return;

  const user = await authenticate(req, res);
  if (!user) return;

  try {
    const { data: apps } = await supabase
      .from('applications')
      .select('status, match_score, applied_at')
      .eq('user_id', user.id);

    if (!apps) return ok(res, { summary: {}, weekly: [], recent: [] });

    // Summary counts
    const summary = {
      total:       apps.length,
      applied:     apps.filter(a => a.status === 'applied').length,
      viewed:      apps.filter(a => a.status === 'viewed').length,
      assessment:  apps.filter(a => a.status === 'assessment').length,
      interview:   apps.filter(a => a.status === 'interview').length,
      offers:      apps.filter(a => a.status === 'offer').length,
      rejected:    apps.filter(a => a.status === 'rejected').length,
      avg_match:   apps.length ? Math.round(apps.reduce((s, a) => s + (a.match_score || 0), 0) / apps.length) : 0,
    };
    summary.success_rate = summary.total > 0
      ? Math.round((summary.interview / summary.total) * 100) : 0;

    // Weekly data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyMap    = {};
    apps.filter(a => new Date(a.applied_at) >= sevenDaysAgo).forEach(a => {
      const date = a.applied_at.split('T')[0];
      weeklyMap[date] = (weeklyMap[date] || 0) + 1;
    });
    const weekly = Object.entries(weeklyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent (last 5)
    const { data: recent } = await supabase
      .from('applications')
      .select('company, position, status, applied_at')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })
      .limit(5);

    return ok(res, { summary, weekly, recent });
  } catch (e) {
    console.error('Stats error:', e);
    return err(res, 'Failed to fetch stats');
  }
};
