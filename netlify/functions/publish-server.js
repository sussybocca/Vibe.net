import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

export async function handler(event, context) {
  const db = neon(process.env.DATABASE_URL);

  try {
    const { ownerId, name } = JSON.parse(event.body);
    if (!ownerId || !name) {
      return { statusCode: 400, body: JSON.stringify({ error: "Owner and name required" }) };
    }

    const result = await db.sql`
      INSERT INTO servers (owner_id, name) VALUES (${ownerId}, ${name}) RETURNING *
    `;

    return { statusCode: 200, body: JSON.stringify({ success: true, server: result[0] }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
