import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

export async function handler(event, context) {
  const db = neon(process.env.DATABASE_URL);

  try {
    const { email, username } = JSON.parse(event.body);

    if (!email || !username) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email and username required" }) };
    }

    const existing = await db.sql`SELECT * FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email already registered" }) };
    }

    const result = await db.sql`INSERT INTO users (email, username) VALUES (${email}, ${username}) RETURNING *`;

    return { statusCode: 200, body: JSON.stringify({ success: true, user: result[0] }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
