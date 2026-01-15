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
    const { 
      q = '', 
      category = 'all', 
      sort = 'newest',
      page = 1,
      limit = 30 
    } = req.query

    let query = supabase
      .from('pages')
      .select(`
        *,
        profiles!pages_owner_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('content_type', 'server')
      .eq('usage_type', 'public')

    // Search
    if (q) {
      query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,content->>'description'.ilike.%${q}%`)
    }

    // Category filter (using pages.category)
    if (category !== 'all') {
      query = query.eq('category', category)
    }

    // Sorting
    switch (sort) {
      case 'popular':
        query = query.order('views', { ascending: false })
        break
      case 'trending':
        // Would need a trending algorithm - using views for now
        query = query.order('views', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: pages, error, count } = await query.range(from, to)

    if (error) throw error

    return res.status(200).json({
      servers: pages.map(page => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        description: page.content?.description || '',
        category: page.category,
        views: page.views || 0,
        created_at: page.created_at,
        owner: page.profiles,
        image_url: page.image_url
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    })

  } catch (error) {
    console.error('Explore error:', error)
    return res.status(500).json({ error: error.message })
  }
}
