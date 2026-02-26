/**
 * elo.js — Pure ELO maths. No side effects, no imports.
 *
 * K-factor schedule:
 *   < 30 matches  → K=64   New pedal, find its level fast.
 *   30–99 matches → K=32   Settling in.
 *   100+ matches  → K=16   Established, hard to manipulate.
 *
 * Matchmaking — two modes, self-selected by data maturity:
 *
 *   BOOTSTRAP  (Elo stdev < 50 across the active pool)
 *     Elo ratings carry no signal yet — sorting them is meaningless.
 *     Just pick two random pedals from different brands.
 *     Every vote is maximally informative: pure exploration.
 *
 *   RANKED     (Elo stdev ≥ 50)
 *     Ratings have diverged enough to carry real signal.
 *     Sort by Elo, pick within a spread window, apply tier rules:
 *
 *     Phase A (0–44):  cross-brand + at least one anchor (≥50 matches).
 *                      User almost always recognises at least one pedal.
 *     Phase B (45–69): cross-brand only, any tier mix.
 *     Phase C (70–79): no constraints — fallback for tiny/filtered pools.
 *
 * The stdev threshold is computed on the active pedal set (whatever is
 * passed in), so Brand Pool filtering is handled automatically.
 */

export const INITIAL_ELO = 1200;

export function getK(matches) {
  if (matches < 30)  return 64;
  if (matches < 100) return 32;
  return 16;
}

export function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

export function calcElo(winner, loser) {
  const kW    = getK(winner.matches);
  const kL    = getK(loser.matches);
  const eW    = expectedScore(winner.elo, loser.elo);
  const eL    = expectedScore(loser.elo, winner.elo);
  const delta = Math.round(kW * (1 - eW));
  return {
    newWinnerElo: winner.elo + delta,
    newLoserElo:  Math.round(loser.elo + kL * (0 - eL)),
    delta,
    eloGap: winner.elo - loser.elo,
  };
}

/** Population standard deviation of Elo ratings across a pedal set. */
function eloStdev(pedals) {
  if (pedals.length < 2) return 0;
  const mean = pedals.reduce((s, p) => s + p.elo, 0) / pedals.length;
  const variance = pedals.reduce((s, p) => s + Math.pow(p.elo - mean, 2), 0) / pedals.length;
  return Math.sqrt(variance);
}

/**
 * Pick a matchup from the active pedal set.
 * Automatically switches between bootstrap and ranked mode based on
 * whether the Elo ratings in this set have meaningfully diverged yet.
 */
export function pickMatchup(pedals, recentIds = new Set()) {
  if (pedals.length < 2) return null;

  const stdev = eloStdev(pedals);
  const bootstrapMode = stdev < 50;

  // ── BOOTSTRAP: ratings carry no signal, just explore cross-brand ──────────
  if (bootstrapMode) {
    const shuffled = [...pedals].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const a = shuffled[i], b = shuffled[j];
        if (a.brand !== b.brand && !recentIds.has(a.id) && !recentIds.has(b.id)) {
          return [a, b];
        }
      }
    }
    // If pool is mono-brand or all recently seen, relax constraints
    return [shuffled[0], shuffled[1]];
  }

  // ── RANKED: Elo is meaningful, use tiered anchor matching ─────────────────
  const sorted = [...pedals].sort((a, b) => a.elo - b.elo);
  const n = sorted.length;
  const isEstablished = (p) => p.matches >= 50;

  for (let attempt = 0; attempt < 80; attempt++) {
    const i      = Math.floor(Math.random() * (n - 1));
    const spread = Math.floor(Math.random() * Math.min(12, n - i - 1)) + 1;
    const a = sorted[i];
    const b = sorted[i + spread];
    if (!b || a.id === b.id) continue;

    const crossBrand = a.brand !== b.brand;
    const hasAnchor  = isEstablished(a) || isEstablished(b);

    if (attempt < 45 && (!crossBrand || !hasAnchor)) continue;
    if (attempt < 70 && !crossBrand) continue;
    // Phase C: no filter

    if (!recentIds.has(a.id) && !recentIds.has(b.id)) return [a, b];
  }

  // Last resort: ignore recency
  const shuffled = [...pedals].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

/** Kept for storage back-compat with any existing battle keys in Redis */
export function battleStorageKey(brandA, brandB) {
  return [brandA, brandB]
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    .sort()
    .join("-vs-");
}
