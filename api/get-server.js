import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    // Get server info
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select(`
        *,
        profiles!servers_owner_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (serverError || !server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Get server files
    const { data: files, error: filesError } = await supabase
      .from('server_files')
      .select('*')
      .eq('server_id', id)
      .order('path');

    if (filesError) throw filesError;

    // Format files object
    const filesObj = {};
    files.forEach(file => {
      filesObj[file.path] = file.content;
    });

    // Get page slug
    const { data: page } = await supabase
      .from('pages')
      .select('slug')
      .eq('content_type', 'server')
      .contains('content', { server_id: parseInt(id) })
      .single();

    return res.status(200).json({
      server: {
        id: server.id,
        name: server.name,
        description: server.description,
        slug: page?.slug,
        views: server.views,
        created_at: server.created_at,
        owner: server.profiles
      },
      files: filesObj
    });

  } catch (error) {
    console.error('Get server error:', error);
    return res.status(500).json({ error: error.message });
  }
}
