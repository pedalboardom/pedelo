/**
 * api/redis.js — Server-side proxy for Upstash Redis.
 *
 * The browser calls /api/redis instead of Upstash directly, so the
 * UPSTASH_URL and UPSTASH_TOKEN environment variables never appear in
 * the client bundle. They live only in Vercel's encrypted environment.
 *
 * Supports two operations, matching the storage.js client:
 *   GET  /api/redis?key=<key>        → { result: <value | null> }
 *   POST /api/redis  body: [cmd...]  → Upstash response JSON
 *
 * Only SET and GET commands are forwarded. Anything else is rejected
 * so this proxy can't be abused as a general Redis REPL even if someone
 * discovers the endpoint.
 */

const ALLOWED_COMMANDS = new Set(["GET", "SET"]);

export default async function handler(req, res) {
  const UPSTASH_URL   = process.env.UPSTASH_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

  // ── Config guard ──────────────────────────────────────────────────────────
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(503).json({ error: "Redis not configured on this server." });
  }

  const authHeader = { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" };

  try {
    // ── GET /api/redis?key=<key> ─────────────────────────────────────────────
    if (req.method === "GET") {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: "Missing key parameter." });

      const upstream = await fetch(
        `${UPSTASH_URL}/get/${encodeURIComponent(key)}`,
        { headers: authHeader }
      );
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    // ── POST /api/redis  body: ["SET", key, value] ───────────────────────────
    if (req.method === "POST") {
      const cmd = req.body; // Vercel auto-parses application/json bodies

      // Validate: must be an array whose first element is an allowed command
      if (
        !Array.isArray(cmd) ||
        cmd.length < 1 ||
        !ALLOWED_COMMANDS.has(String(cmd[0]).toUpperCase())
      ) {
        return res.status(400).json({ error: "Only GET and SET commands are permitted." });
      }

      const upstream = await fetch(UPSTASH_URL, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify(cmd),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[api/redis] Proxy error:", err);
    return res.status(500).json({ error: "Internal proxy error." });
  }
}
