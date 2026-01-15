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

  try {
    const { search = '', page = 1, limit = 20 } = req.query
    
    let query = supabase
      .from('servers')
      .select(`
        *,
        profiles!servers_owner_id_fkey (
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    query = query.range(from, to)

    const { data: servers, error } = await query

    if (error) throw error

    // Also get pages for the slug
    const { data: pages } = await supabase
      .from('pages')
      .select('slug, title')
      .eq('content_type', 'server')

    // Combine data
    const serversWithSlugs = servers.map(server => {
      const page = pages?.find(p => p.title === server.name)
      return {
        ...server,
        slug: page?.slug,
        owner_name: server.profiles?.username || 'Anonymous',
        owner_avatar: server.profiles?.avatar_url
      }
    })

    return res.status(200).json(serversWithSlugs)

  } catch (error) {
    console.error('Get servers error:', error)
    return res.status(500).json({ error: error.message })
  }
}
