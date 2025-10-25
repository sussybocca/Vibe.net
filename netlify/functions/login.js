import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

export async function handler(event, context) {
  const db = neon(process.env.DATABASE_URL);

  try {
    const { email } = JSON.parse(event.body);
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };
    }

    const user = await db.sql`SELECT * FROM users WHERE email = ${email}`;
    if (user.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, user: user[0] }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
