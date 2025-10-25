import { Client } from "@neondatabase/serverless";

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const pendingVerifications = {}; // Must match register.js store; can use a DB instead for persistence

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { email, code } = JSON.parse(event.body);
  const record = pendingVerifications[email];

  if (!record) return { statusCode: 400, body: JSON.stringify({ error: "No pending verification" }) };
  if (record.code !== code.toUpperCase()) return { statusCode: 400, body: JSON.stringify({ error: "Incorrect code" }) };

  try {
    const insertResult = await db.query(
      `INSERT INTO users (email, username) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email, username`,
      [email, record.username]
    );
    delete pendingVerifications[email];

    const user = insertResult.rows.length > 0 ? insertResult.rows[0] : (await db.query("SELECT id, email, username FROM users WHERE email = $1", [email])).rows[0];
    return { statusCode: 200, body: JSON.stringify({ success: true, user }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to save user" }) };
  }
}
