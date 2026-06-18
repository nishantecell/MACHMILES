// api/profile/index.js
const bcrypt   = require('bcryptjs');
const supabase = require('../_lib/supabase');
const { handleCors, ok, badReq, err, authenticate } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const user = await authenticate(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, plan, plan_expires_at, email_verified, avatar_url, last_login_at, created_at, user_profiles(*)')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'PUT') {
      const { name, phone, location, country, desired_job_title, experience_level,
              work_type, expected_salary_min, expected_salary_max, employment_type,
              industries, skills, linkedin_url, github_url, portfolio_url,
              notice_period_days, visa_required, work_authorization, apply_mode,
              blacklisted_companies, bio } = req.body || {};

      if (name) {
        await supabase.from('users').update({ name }).eq('id', user.id);
      }

      const profileUpdates = {};
      const fields = { phone, location, country, desired_job_title, experience_level,
                       work_type, expected_salary_min, expected_salary_max, employment_type,
                       linkedin_url, github_url, portfolio_url, notice_period_days,
                       work_authorization, apply_mode, bio };

      Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) profileUpdates[k] = v; });
      if (industries) profileUpdates.industries = JSON.stringify(industries);
      if (skills)     profileUpdates.skills     = JSON.stringify(skills);
      if (blacklisted_companies) profileUpdates.blacklisted_companies = JSON.stringify(blacklisted_companies);
      if (visa_required !== undefined) profileUpdates.visa_required = visa_required;

      await supabase.from('user_profiles').update(profileUpdates).eq('user_id', user.id);

      return ok(res, null, 'Profile updated');
    }

    return badReq(res, 'Method not allowed');
  } catch (e) {
    console.error('Profile error:', e);
    return err(res, 'Request failed');
  }
};
