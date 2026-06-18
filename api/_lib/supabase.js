// api/_lib/supabase.js
// Shared Supabase client used by all serverless functions

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service key for server-side operations
);

module.exports = supabase;
