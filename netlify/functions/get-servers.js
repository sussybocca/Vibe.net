import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

export async function handler(event, context) {
  const db = neon(process.env.DATABASE_URL);

  try {
    const servers = await db.sql`
      SELECT servers.*, users.username AS owner_name
      FROM servers
      JOIN users ON users.id = servers.owner_id
      ORDER BY servers.created_at DESC
    `;

    return { statusCode: 200, body: JSON.stringify(servers) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
