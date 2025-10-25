import { Client } from "@neondatabase/serverless";

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

export async function handler() {
  try {
    const result = await db.query(`
      SELECT s.*, u.username AS owner_name
      FROM servers s
      JOIN users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `);
    return { statusCode: 200, body: JSON.stringify(result.rows) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch servers" }) };
  }
}
