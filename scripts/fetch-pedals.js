/**
 * scripts/fetch-pedals.js
 *
 * Runs before every Vercel build. Downloads the latest pedals.json from
 * PedalPlayground and writes it to public/data/pedals.json so newly added
 * pedals show up automatically on each deploy.
 *
 * If the fetch fails (network blip, repo renamed, etc.) the existing
 * public/data/pedals.json bundled in the repo is used as a fallback —
 * the build never fails because of this step.
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const SOURCE = "https://raw.githubusercontent.com/PedalPlayground/pedalplayground/master/public/data/pedals.json";
const DEST   = path.join(__dirname, "..", "public", "data", "pedals.json");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end",  ()  => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

(async () => {
  try {
    process.stdout.write("fetch-pedals: downloading from PedalPlayground… ");
    const body = await get(SOURCE);
    JSON.parse(body); // validate — throws if malformed
    fs.mkdirSync(path.dirname(DEST), { recursive: true });
    fs.writeFileSync(DEST, body, "utf8");
    console.log(`✓ ${body.length} bytes written to public/data/pedals.json`);
  } catch (err) {
    console.warn(`⚠  fetch-pedals: ${err.message} — using bundled fallback`);
  }
})();
