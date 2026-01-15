import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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
    const { serverId, userId, files, name, description } = req.body;

    if (!serverId || !userId) {
      return res.status(400).json({ error: 'Missing serverId or userId' });
    }

    // Verify ownership
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    if (serverError) throw serverError;

    if (server.owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this server' });
    }

    // Update server info if provided
    if (name || description) {
      const updates = {};
      if (name) updates.name = name;
      if (description) updates.description = description;
      
      await supabase
        .from('servers')
        .update(updates)
        .eq('id', serverId);
    }

    // Update files
    if (files && typeof files === 'object') {
      for (const [path, content] of Object.entries(files)) {
        // Check if file exists
        const { data: existingFile } = await supabase
          .from('server_files')
          .select('id')
          .eq('server_id', serverId)
          .eq('path', path)
          .single();

        if (existingFile) {
          // Update existing file
          await supabase
            .from('server_files')
            .update({ 
              content: content,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingFile.id);
        } else {
          // Insert new file
          await supabase
            .from('server_files')
            .insert([{
              server_id: serverId,
              path: path,
              content: content
            }]);
        }
      }
    }

    // Update page content
    const { data: page } = await supabase
      .from('pages')
      .select('content')
      .eq('content_type', 'server')
      .contains('content', { server_id: parseInt(serverId) })
      .single();

    if (page) {
      const content = JSON.parse(page.content);
      if (name) content.name = name;
      if (description) content.description = description;
      content.updated_at = new Date().toISOString();
      
      await supabase
        .from('pages')
        .update({ content: JSON.stringify(content) })
        .eq('id', page.id);
    }

    return res.status(200).json({
      success: true,
      message: 'Server updated successfully'
    });

  } catch (error) {
    console.error('Update server error:', error);
    return res.status(500).json({ error: error.message });
  }
}
