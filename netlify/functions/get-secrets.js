import 'dotenv/config';

export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify({
      DATABASE_URL: process.env.DATABASE_URL,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      PORT: process.env.PORT,
    }),
  };
}
