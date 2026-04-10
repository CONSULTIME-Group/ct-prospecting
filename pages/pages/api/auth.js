export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body;
  const correct = process.env.ACCESS_PASSWORD;
  if (!correct || password === correct) {
    res.setHeader("Set-Cookie", `ct_auth=${password}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: "Mot de passe incorrect" });
}
