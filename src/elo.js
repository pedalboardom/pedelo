/**
 * elo.js — Pure ELO maths. No side effects, no imports.
 *
 * K-factor schedule (crowdsourced multi-voter rationale):
 *   < 30 matches  → K=64   New pedal needs to find its level fast. High K lets the
 *                           crowd's consensus emerge quickly rather than letting a few
 *                           early idiosyncratic votes anchor the rating permanently.
 *   30–99 matches → K=32   Settling in. Still responsive to genuine upsets.
 *   100+ matches  → K=16   Well-established. Hard to move without sustained pressure.
 */

export const INITIAL_ELO = 1200;

export function getK(matches) {
  if (matches < 30)  return 64;
  if (matches < 100) return 32;
  return 16;
}

/** Probability that player A beats player B given their ratings */
export function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculate updated ratings after one match.
 * Returns { newWinnerElo, newLoserElo, delta, eloGap }
 * eloGap is the pre-match difference — useful for detecting upsets later.
 */
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
    eloGap: winner.elo - loser.elo, // negative = underdog won
  };
}

/**
 * Standard matchup picker — sorts by ELO, draws nearby-ranked pairs.
 * Avoids recently seen pedals to improve variety.
 */
export function pickMatchup(pedals, recentIds = new Set()) {
  if (pedals.length < 2) return null;
  const sorted = [...pedals].sort((a, b) => a.elo - b.elo);
  const n = sorted.length;

  for (let attempt = 0; attempt < 80; attempt++) {
    const i      = Math.floor(Math.random() * (n - 1));
    const spread = Math.floor(Math.random() * Math.min(8, n - i - 1)) + 1;
    const a = sorted[i];
    const b = sorted[i + spread];
    if (b && a.id !== b.id && !recentIds.has(a.id) && !recentIds.has(b.id)) {
      return [a, b];
    }
  }
  const sh = [...pedals].sort(() => Math.random() - 0.5);
  return [sh[0], sh[1]];
}

/**
 * Battle matchup picker — guarantees one pedal from each brand.
 * Picks from the top of each sorted pool to keep matchups meaningful.
 */
export function pickBattleMatchup(pedalPoolA, pedalPoolB, recentIds = new Set()) {
  if (pedalPoolA.length === 0 || pedalPoolB.length === 0) return null;

  // Sort each brand's pool by ELO so well-matched pairs surface
  const sortedA = [...pedalPoolA].sort((a, b) => b.elo - a.elo);
  const sortedB = [...pedalPoolB].sort((a, b) => b.elo - a.elo);
  const maxIdx  = Math.min(8, Math.min(sortedA.length, sortedB.length));

  for (let attempt = 0; attempt < 60; attempt++) {
    const a = sortedA[Math.floor(Math.random() * maxIdx)];
    const b = sortedB[Math.floor(Math.random() * maxIdx)];
    if (a && b && !recentIds.has(a.id) && !recentIds.has(b.id)) return [a, b];
  }
  return [sortedA[0], sortedB[0]];
}

/** Deterministic key for a brand battle — sorted so (Boss, MXR) === (MXR, Boss) */
export function battleStorageKey(brandA, brandB) {
  return [brandA, brandB]
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    .sort()
    .join("-vs-");
}
