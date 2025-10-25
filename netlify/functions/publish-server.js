import { Client } from "@neondatabase/serverless";

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { ownerId, name, description, html, css, js } = JSON.parse(event.body);

  if (!ownerId || !name) return { statusCode: 400, body: JSON.stringify({ error: "Missing ownerId or server name" }) };

  try {
    const result = await db.query(
      `INSERT INTO servers (owner_id, name, description, html, css, js) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ownerId, name, description || "", html || "<h1>Hello</h1>", css || "h1{color:red;}", js || "console.log('hi');"]
    );
    return { statusCode: 200, body: JSON.stringify({ success: true, server: result.rows[0] }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to create server" }) };
  }
}
