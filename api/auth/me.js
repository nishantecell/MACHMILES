// api/auth/me.js
const supabase = require('../_lib/supabase');
const { handleCors, ok, notFound, err, authenticate } = require('../_lib/helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return;

  const user = await authenticate(req, res);
  if (!user) return;

  try {
    const { data: profile } = await supabase
      .from('users')
      .select(`*, user_profiles(*)`)
      .eq('id', user.id)
      .single();

    if (!profile) return notFound(res, 'User not found');
    delete profile.password_hash;
    return ok(res, profile);
  } catch (e) {
    return err(res, 'Failed to fetch profile');
  }
};
