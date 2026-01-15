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

  const { 
    q = '', 
    category = 'all',
    sort = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Build query for pages table (servers)
    let query = supabase
      .from('pages')
      .select(`
        *,
        profiles!pages_owner_id_fkey (
          username,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('content_type', 'server')
      .eq('usage_type', 'public');

    // Search filter
    if (q) {
      query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,content->>'description'.ilike.%${q}%`);
    }

    // Category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Sorting
    switch (sort) {
      case 'popular':
        query = query.order('views', { ascending: false });
        break;
      case 'trending':
        // Complex trending algorithm would go here
        query = query.order('views', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: pages, error, count } = await query.range(from, to);

    if (error) throw error;

    // Format response
    const servers = pages.map(page => {
      const content = JSON.parse(page.content);
      return {
        id: content.server_id,
        title: page.title,
        slug: page.slug,
        description: content.description || '',
        category: page.category,
        views: page.views || 0,
        created_at: page.created_at,
        owner: page.profiles || { username: 'Anonymous' },
        image_url: page.image_url,
        server_data: content
      };
    });

    return res.status(200).json({
      servers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Explore error:', error);
    return res.status(500).json({ error: error.message });
  }
}
