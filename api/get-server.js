import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { slug } = req.query

  try {
    // Get page data
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .eq('content_type', 'server')
      .single()

    if (pageError || !page) {
      return res.status(404).json({ error: 'Server not found' })
    }

    const content = JSON.parse(page.content)
    const serverId = content.server_id

    // Get server files
    const { data: files, error: filesError } = await supabase
      .from('server_files')
      .select('*')
      .eq('server_id', serverId)

    if (filesError) throw filesError

    // Increment view count
    await supabase
      .from('servers')
      .update({ views: supabase.raw('views + 1') })
      .eq('id', serverId)

    return res.status(200).json({
      server: {
        id: serverId,
        name: page.title,
        slug: page.slug,
        created_at: content.created_at
      },
      files: files.reduce((acc, file) => {
        acc[file.path] = file.content
        return acc
      }, {}),
      raw: content
    })

  } catch (error) {
    console.error('Get server error:', error)
    return res.status(500).json({ error: error.message })
  }
}
