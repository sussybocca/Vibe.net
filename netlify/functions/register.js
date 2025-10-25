import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

export async function handler(event, context) {
  const db = neon(process.env.DATABASE_URL);

  try {
    const { email, username } = JSON.parse(event.body);
    if (!email || !username) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email and username required" }) };
    }

    // Check if email exists
    const existing = await db.sql`SELECT * FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email already registered" }) };
    }

    // Generate verification code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert user with code
    const result = await db.sql`
      INSERT INTO users (email, username)
      VALUES (${email}, ${username})
      RETURNING *
    `;

    // Use EMAIL_USER and EMAIL_PASS directly from environment
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or another service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Vibe.net" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Vibe.net account",
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <b>${code}</b></p>`
    });

    return { statusCode: 200, body: JSON.stringify({ success: true, user: result[0], code }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

