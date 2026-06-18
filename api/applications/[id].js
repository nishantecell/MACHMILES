// api/applications/[id].js
const supabase = require('../_lib/supabase');
const { handleCors, ok, badReq, notFound, err, authenticate } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const user = await authenticate(req, res);
  if (!user) return;

  const { id } = req.query;
  if (!id || isNaN(id)) return badReq(res, 'Invalid ID');

  try {
    // Check ownership
    const { data: existing } = await supabase
      .from('applications').select('*').eq('id', id).eq('user_id', user.id).single();
    if (!existing) return notFound(res, 'Application not found');

    if (req.method === 'GET') return ok(res, existing);

    if (req.method === 'PUT') {
      const updates = {};
      const allowed = ['company','position','job_url','status','match_score',
                       'cover_letter','notes','resume_id','interview_date',
                       'interview_type','offer_amount','rejection_reason'];
      allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const { data, error } = await supabase
        .from('applications').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return ok(res, data, 'Application updated');
    }

    if (req.method === 'DELETE') {
      await supabase.from('applications').delete().eq('id', id);
      return ok(res, null, 'Application deleted');
    }

    return badReq(res, 'Method not allowed');
  } catch (e) {
    console.error('Application[id] error:', e);
    return err(res, 'Request failed');
  }
};
