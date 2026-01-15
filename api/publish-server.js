import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ownerId, name, description, html, css, js, additionalFiles = {}, isPublic = true, category = 'general' } = req.body;

    if (!ownerId || !name) {
      return res.status(400).json({ error: 'Missing required fields: ownerId and name' });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', ownerId)
      .single();

    if (userError) throw userError;

    // Create server in servers table
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .insert([{
        owner_id: ownerId,
        name: name,
        description: description || '',
        views: 0
      }])
      .select()
      .single();

    if (serverError) throw serverError;

    // Create server files
    const filesToInsert = [
      { server_id: server.id, path: '/index.html', content: html || '<html><body><h1>New Server</h1></body></html>' },
      { server_id: server.id, path: '/style.css', content: css || '' },
      { server_id: server.id, path: '/script.js', content: js || '' }
    ];

    // Add additional files
    Object.entries(additionalFiles).forEach(([path, content]) => {
      if (!['/index.html', '/style.css', '/script.js'].includes(path)) {
        filesToInsert.push({
          server_id: server.id,
          path: path,
          content: content
        });
      }
    });

    const { error: filesError } = await supabase
      .from('server_files')
      .insert(filesToInsert);

    if (filesError) throw filesError;

    // Create page entry for serving
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const { error: pageError } = await supabase
      .from('pages')
      .insert([{
        title: name,
        slug: slug,
        content_type: 'server',
        usage_type: isPublic ? 'public' : 'private',
        content: JSON.stringify({
          server_id: server.id,
          owner_id: ownerId,
          owner_name: user.username,
          created_at: new Date().toISOString(),
          description: description || '',
          category: category,
          html: html,
          css: css,
          js: js,
          files: Object.keys(additionalFiles)
        }),
        category: category,
        age_verified: false,
        image_url: null
      }]);

    if (pageError) throw pageError;

    return res.status(200).json({
      success: true,
      serverId: server.id,
      slug: slug,
      url: `/server/${slug}`,
      message: 'Server published successfully'
    });

  } catch (error) {
    console.error('Publish error:', error);
    return res.status(500).json({ error: error.message });
  }
}
