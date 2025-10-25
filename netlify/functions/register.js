import nodemailer from "nodemailer";
import { Client } from "@neondatabase/serverless";

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const pendingVerifications = {};

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { email, username } = JSON.parse(event.body);

  try {
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return { statusCode: 400, body: JSON.stringify({ error: "User exists" }) };

    const codes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 8).toUpperCase());
    const correctCode = codes[Math.floor(Math.random() * codes.length)];

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Server Vibe Verification Codes",
      text: `Here are your codes: ${codes.join(", ")}\nOne is correct.`,
    });

    pendingVerifications[email] = { code: correctCode, username };
    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Verification email sent!" }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to send email" }) };
  }
}
