export async function NetlifySecrets() {
  try {
    const res = await fetch("/.netlify/functions/get-secrets");
    if (!res.ok) throw new Error("Failed to fetch secrets");
    const data = await res.json();
    // Example return: { DATABASE_URL, EMAIL_USER, EMAIL_PASS, PORT }
    return data;
  } catch (err) {
    console.error("Error fetching secrets:", err);
    return {};
  }
}
