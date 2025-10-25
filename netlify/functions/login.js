import { Client } from "@neondatabase/serverless";

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { email } = JSON.parse(event.body);
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };

  try {
    const result = await db.query("SELECT id, email, username FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return { statusCode: 400, body: JSON.stringify({ error: "User not found" }) };
    return { statusCode: 200, body: JSON.stringify({ success: true, user: result.rows[0] }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to login" }) };
  }
}
