/**
 * storage.js — Redis client via the /api/redis server-side proxy.
 *
 * The browser never talks to Upstash directly. All requests go to
 * /api/redis (a Vercel serverless function) which holds the credentials
 * and forwards only GET and SET commands.
 *
 * Key schema:
 *   pedal-elo:global          → { rankings, totalVotes }
 *   pedal-elo:battle:{key}    → { rankings, totalVotes }   (per brand-pair)
 *   pedal-elo:history         → MatchRecord[]              (last 200 votes)
 *
 * Local development: run `vercel dev` instead of `npm run dev`.
 * This starts both the Vite dev server and the api/ functions together,
 * so /api/redis resolves correctly. Without it the app runs in offline
 * mode (rankings won't persist between refreshes).
 */

const API = "/api/redis";

const GLOBAL_KEY    = "pedal-elo:global";
const HISTORY_KEY   = "pedal-elo:history";
const BATTLE_PREFIX = "pedal-elo:battle:";
const MAX_HISTORY   = 200;

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function redisGet(key) {
  try {
    const res = await fetch(`${API}?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const { result } = await res.json();
    return result ? JSON.parse(result) : null;
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["SET", key, JSON.stringify(value)]),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[storage] SET failed:", err);
    }
  } catch (err) {
    console.error("[storage] SET error:", err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load everything needed at startup in one parallel batch */
export async function loadAll() {
  const [global, history] = await Promise.all([
    redisGet(GLOBAL_KEY),
    redisGet(HISTORY_KEY),
  ]);
  return {
    globalData: global  ?? { rankings: {}, totalVotes: 0 },
    history:    history ?? [],
  };
}

/** Load rankings for a specific brand battle (lazy, on demand) */
export async function loadBattleData(battleKey) {
  const data = await redisGet(`${BATTLE_PREFIX}${battleKey}`);
  return data ?? { rankings: {}, totalVotes: 0 };
}

/** Persist global pool */
export function saveGlobal(data) {
  queueSave(GLOBAL_KEY, data);
}

/** Persist a battle pool */
export function saveBattle(battleKey, data) {
  queueSave(`${BATTLE_PREFIX}${battleKey}`, data);
}

/** Append a match record to history, capped at MAX_HISTORY */
export function appendHistory(record, currentHistory) {
  const next = [record, ...currentHistory].slice(0, MAX_HISTORY);
  queueSave(HISTORY_KEY, next);
  return next;
}

/**
 * Always returns true — the proxy handles configuration errors gracefully.
 * The UI shows "offline" if the first loadAll() call returns no data.
 */
export function isConfigured() {
  return true;
}

// ─── Debounce queue ───────────────────────────────────────────────────────────
// Each key gets its own timer so a busy battle pool doesn't delay global saves.

const timers  = {};
const pending = {};

function queueSave(key, data) {
  pending[key] = data;
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    redisSet(key, pending[key]);
    delete pending[key];
    delete timers[key];
  }, 700);
}
