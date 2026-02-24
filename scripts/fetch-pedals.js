/**
 * scripts/fetch-pedals.js
 *
 * Runs before every Vercel build. Downloads the latest pedals.json from
 * PedalPlayground and writes it to public/data/pedals.json so newly added
 * pedals show up automatically on each deploy.
 *
 * If the fetch fails the existing bundled file is used as a fallback —
 * the build never fails because of this step.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEST = join(__dirname, "..", "public", "data", "pedals.json");
const SOURCE = "https://raw.githubusercontent.com/PedalPlayground/pedalplayground/master/public/data/pedals.json";

try {
  process.stdout.write("fetch-pedals: downloading from PedalPlayground… ");
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  JSON.parse(body); // validate — throws if malformed
  mkdirSync(dirname(DEST), { recursive: true });
  writeFileSync(DEST, body, "utf8");
  console.log(`✓ ${body.length} bytes written to public/data/pedals.json`);
} catch (err) {
  console.warn(`⚠  fetch-pedals: ${err.message} — using bundled fallback`);
}
