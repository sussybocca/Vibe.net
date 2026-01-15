import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    // Get page data
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .eq('content_type', 'server')
      .single();

    if (pageError || !page) {
      return res.status(404).send('Server not found');
    }

    const content = JSON.parse(page.content);
    const serverId = content.server_id;

    // Get server files
    const { data: files, error: filesError } = await supabase
      .from('server_files')
      .select('*')
      .eq('server_id', serverId);

    if (filesError) throw filesError;

    // Increment view count
    await supabase
      .from('servers')
      .update({ views: supabase.raw('views + 1') })
      .eq('id', serverId);

    // Update analytics
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_server_views', {
      server_id_param: serverId,
      date_param: today
    });

    // Get HTML content
    const htmlFile = files.find(f => f.path === '/index.html');
    const cssFile = files.find(f => f.path === '/style.css');
    const jsFile = files.find(f => f.path === '/script.js');

    let html = htmlFile?.content || '<h1>Server not found</h1>';
    
    // Inject CSS and JS
    if (cssFile?.content) {
      html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
    }
    
    if (jsFile?.content) {
      html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
    }

    // Add view counter if not present
    if (!html.includes('data-vibe-server')) {
      html = html.replace('</body>', `
        <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; z-index: 9999;">
          <i class="fas fa-eye"></i> ${page.views || 0} views | Powered by Vibe.net
        </div>
        <script>
          // Vibe.net Server Analytics
          fetch('/api/server-view?slug=${slug}', { method: 'POST' });
        </script>
      </body>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Serve server error:', error);
    res.status(500).send('Error loading server');
  }
}
