import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { ownerId, name, description, html, css, js, isPublic = true } = req.body

    if (!ownerId || !name) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // 1. Create server in servers table
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .insert([
        {
          owner_id: ownerId,
          name,
          description: description || '',
          views: 0
        }
      ])
      .select()
      .single()

    if (serverError) throw serverError

    // 2. Create server files (main page)
    const { error: filesError } = await supabase
      .from('server_files')
      .insert([
        {
          server_id: server.id,
          path: '/index.html',
          content: html || '<html><body><h1>Welcome to my server!</h1></body></html>'
        },
        {
          server_id: server.id,
          path: '/style.css',
          content: css || 'body { font-family: Arial, sans-serif; }'
        },
        {
          server_id: server.id,
          path: '/script.js',
          content: js || 'console.log("Server loaded")'
        }
      ])

    if (filesError) throw filesError

    // 3. Create a site entry for easy serving
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36)
    
    const { error: siteError } = await supabase
      .from('pages')
      .insert([
        {
          title: name,
          slug: slug,
          content_type: 'server',
          usage_type: 'public',
          content: JSON.stringify({
            server_id: server.id,
            html,
            css,
            js,
            created_at: new Date().toISOString()
          }),
          category: 'server',
          age_verified: false,
          image_url: null
        }
      ])

    if (siteError) throw siteError

    return res.status(200).json({
      success: true,
      serverId: server.id,
      slug: slug,
      message: 'Server published successfully'
    })

  } catch (error) {
    console.error('Publish error:', error)
    return res.status(500).json({ error: error.message })
  }
}
