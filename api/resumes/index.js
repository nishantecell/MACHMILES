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
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return ok(res, data || []);
    }

    if (req.method === 'POST') {
      const { title, template, resume_data } = req.body || {};
      if (!title) return badReq(res, 'Title is required');
      const { data, error } = await supabase
        .from('resumes')
        .insert({ user_id: userId, title, template: template || 'classic', resume_data: resume_data || {}, updated_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      return created(res, data, 'Resume saved');
    }

    if (req.method === 'PUT') {
      const { id, title, template, resume_data } = req.body || {};
      if (!id) return badReq(res, 'Resume ID required');
      const { data, error } = await supabase
        .from('resumes')
        .update({ title, template, resume_data, updated_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', userId)
        .select().single();
      if (error) throw error;
      return ok(res, data, 'Resume updated');
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return badReq(res, 'Resume ID required');
      await supabase.from('resumes').delete().eq('id', id).eq('user_id', userId);
      return ok(res, null, 'Resume deleted');
    }

    return badReq(res, 'Method not allowed');
  } catch (e) {
    console.error('Resumes error:', e.message);
    return err(res, 'Request failed');
  }
}
