import { createClient } from '@supabase/supabase-js';
import { handleCors, ok, badReq, err, authenticate } from '../_lib/helpers.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await authenticate(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'PUT') {
      const allowed = ['full_name', 'phone', 'location', 'desired_job_title', 'experience_level',
                       'work_type', 'salary', 'linkedin_url', 'github_url', 'bio',
                       'onboarded', 'notice_period', 'total_experience', 'current_salary'];
      const updates = {};
      allowed.forEach(f => { if (req.body?.[f] !== undefined) updates[f] = req.body[f]; });
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
      if (error) throw error;
      return ok(res, data, 'Profile updated');
    }

    return badReq(res, 'Method not allowed');
  } catch (e) {
    console.error('Profile error:', e);
    return err(res, 'Request failed');
  }
}
