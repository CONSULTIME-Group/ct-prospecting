// Cache en mémoire (persiste entre requêtes dans la même instance Vercel)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

// Rate limiting par IP
const rateLimits = new Map();
const RATE_WINDOW = 60 * 1000; // 1 minute
const RATE_MAX = 15; // 15 requêtes/minute/IP

function checkRate(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count++;
  rateLimits.set(ip, entry);
  if (rateLimits.size > 500) rateLimits.delete(rateLimits.keys().next().value);
  return entry.count <= RATE_MAX;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY manquante." } });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
  if (!checkRate(ip)) return res.status(429).json({ error: { message: "Trop de requêtes. Attends une minute." } });

  const { system, messages, max_tokens, nocache } = req.body;
  if (!system || !messages) return res.status(400).json({ error: { message: "Paramètres manquants." } });

  // Cache check
  const cacheKey = `${system.slice(0, 100)}::${messages[0]?.content}`;
  if (!nocache) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(hit.data);
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: max_tokens || 8000,
        system,
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(response.status).json(data);

    // Mise en cache
    cache.set(cacheKey, { data, ts: Date.now() });
    if (cache.size > 200) cache.delete(cache.keys().next().value);

    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
