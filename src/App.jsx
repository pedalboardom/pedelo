import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  INITIAL_ELO, getK, calcElo,
  pickMatchup,
} from "./elo.js";
import {
  loadAll,
  saveGlobal, appendHistory, isConfigured,
} from "./storage.js";
import { fetchPedals } from "./pedals.js";

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,400&display=swap');

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

:root {
  --bg:       #0a0a0a;
  --s1:       #131313;
  --s2:       #1b1b1b;
  --s3:       #222;
  --border:   #272727;
  --accent:   #f97316;
  --a-dim:    rgba(249,115,22,.15);
  --gold:     #fbbf24;
  --silver:   #94a3b8;
  --bronze:   #c97a35;
  --text:     #e2e2e2;
  --dim:      #5a5a5a;
  --dim2:     #888;
  --green:    #22c55e;
  --red:      #ef4444;
  --blue:     #60a5fa;
  --fd:       'Bebas Neue', sans-serif;
  --fb:       'Barlow', sans-serif;
  --fc:       'Barlow Condensed', sans-serif;
}

html,body,#root { height:100%; }
body { background:var(--bg); color:var(--text); font-family:var(--fb); overflow:hidden; }

/* ── App shell ────────────────────────────────────────────────────────── */
.app {
  display:flex; height:100vh;
  background:var(--bg);
  background-image:
    radial-gradient(ellipse 70% 40% at 10% 0%,  rgba(249,115,22,.06) 0%, transparent 60%),
    radial-gradient(ellipse 50% 30% at 90% 100%, rgba(249,115,22,.04) 0%, transparent 60%);
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width:280px; min-width:280px; display:flex; flex-direction:column;
  border-right:1px solid var(--border); background:var(--s1); overflow:hidden;
}

.sb-top { padding:16px 14px 12px; background:var(--s2); border-bottom:1px solid var(--border); flex-shrink:0; }
.sb-logo { font-family:var(--fd); font-size:24px; letter-spacing:3px; color:var(--accent); line-height:1; }
.sb-sub  { font-family:var(--fc); font-size:10px; color:var(--dim); text-transform:uppercase; letter-spacing:2.5px; margin-top:2px; }

/* Sidebar tabs */
.sb-tabs { display:flex; border-bottom:1px solid var(--border); flex-shrink:0; }
.sb-tab {
  flex:1; padding:9px 4px; text-align:center; cursor:pointer; background:transparent;
  border:none; font-family:var(--fc); font-size:12px; font-weight:700; text-transform:uppercase;
  letter-spacing:1.5px; color:var(--dim); transition:color .15s, background .15s;
  border-bottom:2px solid transparent; margin-bottom:-1px;
}
.sb-tab:hover  { color:var(--text); background:var(--s2); }
.sb-tab.active { color:var(--accent); border-bottom-color:var(--accent); background:var(--s1); }

/* Stats row */
.stat-row { display:flex; border-bottom:1px solid var(--border); flex-shrink:0; }
.stat { flex:1; padding:8px 4px; text-align:center; border-right:1px solid var(--border); background:var(--s2); }
.stat:last-child { border-right:none; }
.stat-v { font-family:var(--fd); font-size:20px; color:var(--accent); line-height:1; }
.stat-l { font-size:9px; color:var(--dim); text-transform:uppercase; letter-spacing:1px; margin-top:1px; }

/* ── Mode selector ────────────────────────────────────────────────────── */
.mode-section { padding:10px 12px 8px; border-bottom:1px solid var(--border); flex-shrink:0; background:var(--s1); }
.mode-label { font-family:var(--fc); font-size:9px; text-transform:uppercase; letter-spacing:2px; color:var(--dim); margin-bottom:6px; }
.mode-pills { display:flex; gap:5px; }
.mode-pill {
  flex:1; padding:5px 2px; text-align:center; cursor:pointer;
  background:var(--s2); border:1px solid var(--border); border-radius:5px;
  font-family:var(--fc); font-size:11px; font-weight:700; text-transform:uppercase;
  letter-spacing:.5px; color:var(--dim); transition:all .15s;
}
.mode-pill:hover  { border-color:var(--dim2); color:var(--text); }
.mode-pill.active { background:var(--a-dim); border-color:var(--accent); color:var(--accent); }

/* ── Brand filter ─────────────────────────────────────────────────────── */
.brand-section { padding:8px 12px; border-bottom:1px solid var(--border); flex-shrink:0; }

/* Brand Pool search + tags */
.bp-search-wrap { position:relative; margin-bottom:6px; }
.bp-input {
  width:100%; background:var(--s2); border:1px solid var(--border); border-radius:6px;
  padding:6px 28px 6px 8px; color:var(--text); font-family:var(--fc); font-size:12px;
  transition:border-color .15s;
}
.bp-input:focus { outline:none; border-color:var(--accent); }
.bp-input::placeholder { color:var(--dim); }
.bp-clear {
  position:absolute; right:7px; top:50%; transform:translateY(-50%);
  background:transparent; border:none; color:var(--dim); cursor:pointer;
  font-size:14px; line-height:1; padding:0; transition:color .15s;
}
.bp-clear:hover { color:var(--text); }
.bp-dropdown {
  position:absolute; top:calc(100% + 3px); left:0; right:0; z-index:400;
  background:var(--s1); border:1px solid var(--border); border-radius:6px;
  overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,.4);
  max-height:180px; overflow-y:auto;
}
.bp-dropdown::-webkit-scrollbar { width:3px; }
.bp-dropdown::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
.bp-dropdown-item {
  display:flex; align-items:center; justify-content:space-between;
  padding:7px 10px; cursor:pointer; font-family:var(--fc); font-size:12px; color:var(--dim2);
  transition:background .1s, color .1s;
}
.bp-dropdown-item:hover { background:var(--s2); color:var(--text); }
.bp-dropdown-item-count { font-size:10px; color:var(--dim); }
.bp-dropdown-empty { padding:10px; font-family:var(--fc); font-size:11px; color:var(--dim); text-align:center; }
.bp-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
.bp-tag {
  display:inline-flex; align-items:center; gap:4px;
  padding:2px 6px 2px 8px; background:var(--a-dim); border:1px solid var(--accent);
  border-radius:20px; font-family:var(--fc); font-size:10px; color:var(--accent);
  max-width:120px;
}
.bp-tag-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bp-tag-remove {
  background:transparent; border:none; color:var(--accent); cursor:pointer;
  font-size:12px; line-height:1; padding:0; flex-shrink:0; opacity:.7; transition:opacity .15s;
}
.bp-tag-remove:hover { opacity:1; }
.bp-all-msg { font-family:var(--fc); font-size:10px; color:var(--dim); font-style:italic; margin-top:2px; }
.brand-label { font-family:var(--fc); font-size:9px; text-transform:uppercase; letter-spacing:2px; color:var(--dim); margin-bottom:6px; }
.brand-scroll { max-height:130px; overflow-y:auto; display:flex; flex-direction:column; gap:3px; }
.brand-scroll::-webkit-scrollbar { width:3px; }
.brand-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

.brand-chip {
  display:flex; align-items:center; gap:7px; padding:4px 8px;
  background:var(--s2); border:1px solid var(--border); border-radius:5px;
  cursor:pointer; transition:all .12s; font-family:var(--fc); font-size:11px; color:var(--dim2);
}
.brand-chip:hover  { border-color:var(--dim2); color:var(--text); }
.brand-chip.active { background:var(--a-dim); border-color:var(--accent); color:var(--text); }
.brand-chip-dot    { width:7px; height:7px; border-radius:50%; background:var(--border); flex-shrink:0; transition:background .12s; }
.brand-chip.active .brand-chip-dot { background:var(--accent); }
.brand-chip-name   { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.brand-chip-count  { font-size:9px; color:var(--dim); }



/* ── Leaderboard ──────────────────────────────────────────────────────── */
.lb-scroll { flex:1; overflow-y:auto; padding:4px 0; }
.lb-scroll::-webkit-scrollbar { width:3px; }
.lb-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
.lb-head { font-family:var(--fc); font-size:9px; text-transform:uppercase; letter-spacing:2px; color:var(--dim); padding:6px 12px 2px; }

.lb-row { display:flex; align-items:center; gap:7px; padding:4px 10px; transition:background .1s; cursor:default; }
.lb-row:hover { background:var(--s2); }
.lb-rank { font-family:var(--fc); font-size:11px; font-weight:700; width:20px; text-align:center; color:var(--dim); flex-shrink:0; }
.lb-rank.gold   { color:var(--gold); }
.lb-rank.silver { color:var(--silver); }
.lb-rank.bronze { color:var(--bronze); }
.lb-thumb { width:28px; height:28px; border-radius:5px; object-fit:contain; background:var(--s2); border:1px solid var(--border); padding:2px; flex-shrink:0; }
.lb-thumb-ph { width:28px; height:28px; border-radius:5px; background:var(--s2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.lb-info { flex:1; min-width:0; }
.lb-name  { font-family:var(--fc); font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; }
.lb-brand { font-size:9px; color:var(--dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lb-right { text-align:right; flex-shrink:0; }
.lb-elo   { font-family:var(--fc); font-size:13px; font-weight:700; color:var(--accent); }
.lb-m     { font-size:9px; color:var(--dim); }

/* Sidebar footer */
.sb-footer {
  border-top:1px solid var(--border); padding:9px 12px;
  background:var(--s2); flex-shrink:0; display:flex; flex-direction:column; gap:5px;
}
.sync-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:5px; vertical-align:middle; }
.sync-ok      .sync-dot { background:var(--green); }
.sync-saving  .sync-dot { background:var(--accent); animation:blink 1s step-end infinite; }
.sync-error   .sync-dot { background:var(--red); }
.sync-offline .sync-dot { background:var(--dim); }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
.sync-txt { font-family:var(--fc); font-size:10px; text-transform:uppercase; letter-spacing:1px; }
.sync-ok      .sync-txt { color:var(--green); }
.sync-saving  .sync-txt { color:var(--accent); }
.sync-error   .sync-txt { color:var(--red); }
.sync-offline .sync-txt { color:var(--dim); }
.reset-btn {
  width:100%; padding:6px; background:transparent; border:1px solid var(--border);
  border-radius:5px; color:var(--dim); font-family:var(--fc); font-size:10px;
  letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all .15s; margin-top:4px;
}
.reset-btn:hover { border-color:var(--red); color:var(--red); }
/* ── Main column ──────────────────────────────────────────────────────── */
.main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }

.main-header {
  padding:16px 26px 13px; border-bottom:1px solid var(--border);
  background:var(--s1); display:flex; align-items:flex-end; gap:12px; flex-shrink:0;
}
.main-title { font-family:var(--fd); font-size:32px; letter-spacing:4px; line-height:1; }
.main-title em { color:var(--accent); font-style:normal; }
.round-pill {
  font-family:var(--fc); font-size:11px; font-weight:700; color:var(--dim);
  border:1px solid var(--border); border-radius:20px; padding:2px 10px;
  letter-spacing:1px; text-transform:uppercase; margin-bottom:2px;
}


/* ── Top nav (desktop only) ───────────────────────────────────────────── */
.top-nav {
  display:flex; align-items:center; gap:0;
  background:var(--s1); border-bottom:1px solid var(--border); flex-shrink:0;
  padding:0 20px;
}
.top-nav-logo {
  font-family:var(--fd); font-size:20px; letter-spacing:3px; color:var(--accent);
  line-height:1; flex-shrink:0; margin-right:24px; padding:12px 0;
}
.top-nav-tabs { display:flex; flex:1; }
.top-nav-tab {
  padding:14px 16px; background:transparent; border:none; border-bottom:2px solid transparent;
  font-family:var(--fc); font-size:12px; font-weight:700; text-transform:uppercase;
  letter-spacing:1.5px; color:var(--dim); cursor:pointer; transition:color .15s;
  margin-bottom:-1px; white-space:nowrap;
}
.top-nav-tab:hover  { color:var(--text); }
.top-nav-tab.active { color:var(--accent); border-bottom-color:var(--accent); }
.top-nav-right { display:flex; align-items:center; gap:14px; flex-shrink:0; margin-left:auto; }
.top-nav-mode  { display:flex; gap:5px; }
.top-nav-pill {
  padding:4px 12px; background:var(--s2); border:1px solid var(--border); border-radius:20px;
  font-family:var(--fc); font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:.5px; color:var(--dim); cursor:pointer; transition:all .15s;
}
.top-nav-pill:hover  { border-color:var(--dim2); color:var(--text); }
.top-nav-pill.active { background:var(--a-dim); border-color:var(--accent); color:var(--accent); }
.top-nav-sync { font-family:var(--fc); font-size:10px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; white-space:nowrap; }

/* ── Filter bar (desktop only, below top-nav when Brand Pool active) ──── */
.filter-bar {
  background:var(--s1); border-bottom:1px solid var(--border); flex-shrink:0; padding:0;
}
.filter-bar .brand-section { border-bottom:none; padding:8px 20px; }

/* ── Mobile mode strip (below main-header on mobile, hidden on desktop) ─ */
.mobile-mode { display:none; }

/* ── Full-width rankings panel (desktop Rankings tab) ─────────────────── */
.rankings-panel {
  flex:1; display:flex; flex-direction:column; overflow:hidden; min-height:0;
}
.rankings-panel .stat-row { flex-shrink:0; }
.rankings-panel .lb-scroll { flex:1; }
.lb-scroll-inner { max-width:700px; margin:0 auto; padding:0 20px; }

/* ── Voting arena ─────────────────────────────────────────────────────── */
/* arena-wrap fills remaining main height and centres the card block */
.arena-wrap {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  overflow:hidden; min-height:0;
}
.arena {
  flex:0 0 auto; display:flex; align-items:center; justify-content:center;
  padding:24px 28px; overflow:hidden; width:100%;
}
.card-col { flex:1; max-width:410px; display:flex; flex-direction:column; align-items:center; }

.pedal-card {
  width:100%; background:var(--s1); border:2px solid var(--border); border-radius:16px;
  padding:24px 20px 20px; display:flex; flex-direction:column; align-items:center; gap:13px;
  cursor:pointer; position:relative; overflow:hidden; outline:none;
  transition:border-color .18s, transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .18s, opacity .25s;
}
.pedal-card::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse at 50% 0%, rgba(249,115,22,.08) 0%, transparent 55%);
  opacity:0; transition:opacity .2s;
}
.pedal-card:hover { border-color:var(--accent); transform:translateY(-5px) scale(1.012); box-shadow:0 20px 50px rgba(249,115,22,.16); }
.pedal-card:hover::after { opacity:1; }
.pedal-card:active { transform:translateY(-1px) scale(.99); }
.pedal-card.winner {
  border-color:var(--green); box-shadow:0 0 0 1px var(--green), 0 20px 50px rgba(34,197,94,.18);
  animation:winBounce .4s cubic-bezier(.34,1.56,.64,1);
}
.pedal-card.loser { opacity:.3; transform:scale(.97); border-color:var(--border); cursor:default; }
@keyframes winBounce { 0%{transform:scale(1)} 40%{transform:scale(1.045)} 100%{transform:scale(1)} }

.img-wrap {
  width:160px; height:160px; display:flex; align-items:center; justify-content:center;
  background:var(--s2); border-radius:10px; border:1px solid var(--border); overflow:hidden; flex-shrink:0;
}
.pedal-img { max-width:144px; max-height:144px; object-fit:contain; transition:transform .3s; }
.pedal-card:hover .pedal-img { transform:scale(1.07); }
.img-ph { display:flex; flex-direction:column; align-items:center; gap:6px; opacity:.25; font-family:var(--fc); font-size:10px; text-transform:uppercase; }
.img-ph span { font-size:42px; }

.pedal-meta { text-align:center; width:100%; }
.pedal-brand { font-family:var(--fc); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:3px; color:var(--accent); margin-bottom:2px; }
.pedal-name  { font-family:var(--fc); font-size:20px; font-weight:900; line-height:1.1; }
.pedal-stats { display:flex; gap:12px; justify-content:center; margin-top:4px; }
.ps-v { font-family:var(--fc); font-size:14px; font-weight:700; }
.ps-l { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:var(--dim); }
.vote-hint {
  font-family:var(--fc); font-size:11px; text-transform:uppercase; letter-spacing:2px;
  color:var(--dim); padding:4px 12px; border:1px solid var(--border); border-radius:20px;
  transition:all .2s; flex-shrink:0;
}
.pedal-card:hover .vote-hint { border-color:var(--accent); color:var(--accent); }

.vs-wrap { padding:0 20px; display:flex; flex-direction:column; align-items:center; gap:8px; flex-shrink:0; }
.vs-line { width:1px; height:52px; background:linear-gradient(to bottom,transparent,var(--border),transparent); }
.vs-text { font-family:var(--fd); font-size:28px; letter-spacing:3px; color:var(--dim); }

/* ── Vote controls: skip + hints, centred below cards ─────────────────── */
.vote-controls {
  display:flex; flex-direction:column; align-items:center;
  gap:10px; padding:16px 26px 12px; flex-shrink:0;
}
.skip-btn {
  padding:5px 20px; background:transparent; border:1px solid var(--border); border-radius:20px;
  color:var(--dim); font-family:var(--fc); font-size:11px; letter-spacing:1px;
  text-transform:uppercase; cursor:pointer; transition:all .15s;
}
.skip-btn:hover { border-color:var(--accent); color:var(--accent); }

/* Keyboard hint row (desktop) */
.kbd-hint {
  display:flex; align-items:center; gap:16px;
}
.kbd-hint-label {
  font-family:var(--fc); font-size:10px; color:var(--dim);
  text-transform:uppercase; letter-spacing:1px;
}
.kbd-item {
  display:flex; align-items:center; gap:5px;
  font-family:var(--fc); font-size:10px; color:var(--dim);
  text-transform:uppercase; letter-spacing:1px;
}

/* Swipe hint — mobile only (hidden by default) */
.swipe-hint { display:none; }

/* ── K-bar: k-factor info, bottom of main above footer (desktop only) ── */
.k-bar {
  border-top:1px solid var(--border); background:var(--s1);
  padding:7px 26px; display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.k-note { font-family:var(--fc); font-size:11px; color:var(--dim); }
.k-note b { color:var(--text); font-weight:700; }
.kbd {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:22px; height:20px; padding:0 5px;
  background:var(--s2); border:1px solid var(--border); border-bottom-width:2px;
  border-radius:4px; font-family:var(--fc); font-size:11px; font-weight:700;
  color:var(--dim2); line-height:1;
}
/* ── Footer ───────────────────────────────────────────────────────────── */
.footer {
  border-top:1px solid var(--border); background:var(--bg);
  padding:6px 26px; display:flex; align-items:center; justify-content:space-between;
  flex-shrink:0; gap:12px;
}
.footer-txt { font-family:var(--fc); font-size:10px; color:var(--dim); letter-spacing:.5px; }
.footer-txt a { color:var(--accent); text-decoration:underline; text-underline-offset:2px; transition:opacity .15s; }
.footer-txt a:hover { opacity:.75; }

/* ── Delta floaters ───────────────────────────────────────────────────── */
.delta {
  position:fixed; pointer-events:none; z-index:999;
  font-family:var(--fc); font-size:19px; font-weight:700;
  transform:translate(-50%,-50%); animation:floatUp 1.1s ease-out forwards;
}
.delta.pos { color:var(--green); }
.delta.neg { color:var(--red); }
@keyframes floatUp {
  0%   { opacity:1; transform:translate(-50%,-50%); }
  100% { opacity:0; transform:translate(-50%,calc(-50% - 62px)); }
}

/* ── Loading / empty states ────────────────────────────────────────────── */
.loading { height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; }
.loading-title { font-family:var(--fd); font-size:52px; letter-spacing:6px; color:var(--accent); animation:breathe 1.4s ease-in-out infinite; }
.loading-sub   { font-family:var(--fc); font-size:12px; color:var(--dim); text-transform:uppercase; letter-spacing:3px; }
@keyframes breathe { 0%,100%{opacity:1} 50%{opacity:.3} }
.empty-state { display:flex; align-items:center; justify-content:center; height:100%; }
.empty-inner { text-align:center; }
.empty-icon  { font-size:48px; margin-bottom:12px; opacity:.4; }
.empty-msg   { font-family:var(--fc); font-size:14px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; }
.empty-sub   { font-family:var(--fc); font-size:11px; color:var(--dim); margin-top:5px; }

/* ── ANALYSIS PANEL ───────────────────────────────────────────────────── */
.analysis-area {
  flex:1; overflow-y:auto; padding:20px 24px 24px; display:flex; flex-direction:column; gap:16px;
}
.analysis-area::-webkit-scrollbar { width:4px; }
.analysis-area::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

.a-card { background:var(--s1); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.a-card-head {
  padding:10px 14px; background:var(--s2); border-bottom:1px solid var(--border);
  font-family:var(--fc); font-size:11px; font-weight:700; text-transform:uppercase;
  letter-spacing:2px; color:var(--dim2); display:flex; align-items:center; gap:8px;
}
.a-card-head .accent { color:var(--accent); }
.a-card-body { padding:12px 14px; }

/* Explorer */
.explorer-controls { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.a-search {
  flex:1; min-width:120px; background:var(--s2); border:1px solid var(--border);
  border-radius:6px; padding:6px 10px; color:var(--text); font-family:var(--fc);
  font-size:12px; transition:border-color .15s;
}
.a-search:focus { outline:none; border-color:var(--accent); }
.a-search::placeholder { color:var(--dim); }
.tog-group { display:flex; gap:4px; }
.tog {
  padding:5px 10px; background:var(--s2); border:1px solid var(--border); border-radius:5px;
  font-family:var(--fc); font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:1px; color:var(--dim); cursor:pointer; transition:all .12s;
}
.tog:hover  { color:var(--text); border-color:var(--dim2); }
.tog.active { background:var(--a-dim); border-color:var(--accent); color:var(--accent); }

/* Explorer brand filter */
.explorer-brands { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px; }
.ebrand-chip {
  padding:2px 8px; border-radius:20px; border:1px solid var(--border);
  font-family:var(--fc); font-size:10px; color:var(--dim); cursor:pointer; transition:all .12s;
}
.ebrand-chip:hover  { border-color:var(--dim2); color:var(--text); }
.ebrand-chip.active { background:var(--a-dim); border-color:var(--accent); color:var(--accent); }

/* Pedal table */
.pedal-table { width:100%; border-collapse:collapse; }
.pedal-table th {
  font-family:var(--fc); font-size:9px; text-transform:uppercase; letter-spacing:1.5px;
  color:var(--dim); text-align:left; padding:4px 6px; border-bottom:1px solid var(--border);
}
.pedal-table th.r, .pedal-table td.r { text-align:right; }
.pedal-table td { font-family:var(--fc); font-size:12px; padding:5px 6px; border-bottom:1px solid rgba(255,255,255,.03); vertical-align:middle; }
.pedal-table tr:last-child td { border-bottom:none; }
.pedal-table tr:hover td { background:var(--s2); }
.td-rank { font-weight:700; color:var(--dim); width:28px; }
.td-thumb { width:28px; }
.td-name  { font-weight:700; }
.td-brand { color:var(--dim2); font-size:10px; }
.td-elo   { font-weight:700; color:var(--accent); }
.td-wr    { font-size:11px; }
.td-wr.up { color:var(--green); }
.td-wr.dn { color:var(--red); }

/* Brand report */
.brand-table { width:100%; border-collapse:collapse; }
.brand-table th { font-family:var(--fc); font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:var(--dim); text-align:left; padding:4px 6px; border-bottom:1px solid var(--border); }
.brand-table th.r, .brand-table td.r { text-align:right; }
.brand-table td { font-family:var(--fc); font-size:12px; padding:5px 6px; border-bottom:1px solid rgba(255,255,255,.03); }
.brand-table tr:last-child td { border-bottom:none; }
.brand-table tr:hover td { background:var(--s2); }
.brand-bar-wrap { width:80px; height:4px; background:var(--s3); border-radius:2px; display:inline-block; vertical-align:middle; }
.brand-bar      { height:100%; border-radius:2px; background:var(--accent); transition:width .3s; }

/* Contested */
.contested-item { display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.03); }
.contested-item:last-child { border-bottom:none; }
.contested-info { flex:1; min-width:0; }
.contested-name  { font-family:var(--fc); font-size:13px; font-weight:700; }
.contested-brand { font-size:10px; color:var(--dim2); }
.contested-bar-wrap { width:80px; }
.contested-bar-track { height:4px; background:var(--s3); border-radius:2px; position:relative; margin-bottom:2px; }
.contested-bar-fill  { height:100%; border-radius:2px; background:var(--gold); }
.contested-pct { font-family:var(--fc); font-size:10px; color:var(--dim2); text-align:right; }
.contested-elo { font-family:var(--fc); font-size:12px; color:var(--accent); font-weight:700; text-align:right; flex-shrink:0; }

/* History feed */
.history-item { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.03); font-family:var(--fc); font-size:11px; }
.history-item:last-child { border-bottom:none; }
.history-winner { font-weight:700; color:var(--text); min-width:0; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.history-beat   { color:var(--dim); flex-shrink:0; }
.history-loser  { color:var(--dim2); min-width:0; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.history-delta  { color:var(--green); font-weight:700; flex-shrink:0; }
.history-mode   { font-size:9px; color:var(--dim); flex-shrink:0; padding:1px 5px; border:1px solid var(--border); border-radius:3px; }

/* Analysis grid for 2-col cards */
.analysis-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:900px) { .analysis-grid { grid-template-columns:1fr; } }

/* ── About panel ──────────────────────────────────────────────────────── */
.about-area {
  flex:1; overflow-y:auto; padding:22px 28px 28px;
  display:flex; flex-direction:column; gap:0;
}
.about-area::-webkit-scrollbar { width:4px; }
.about-area::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

.about-section {
  padding:20px 0 20px;
  border-bottom:1px solid var(--border);
}
.about-section:last-child { border-bottom:none; }

.about-section-label {
  font-family:var(--fc); font-size:11px; text-transform:uppercase;
  letter-spacing:3px; color:var(--accent); margin-bottom:8px;
}

.about-h1 {
  font-family:var(--fd); font-size:36px; letter-spacing:3px;
  color:var(--text); line-height:1; margin-bottom:10px;
}
.about-h1 em { color:var(--accent); font-style:normal; }

.about-h2 {
  font-family:var(--fd); font-size:22px; letter-spacing:2px;
  color:var(--text); line-height:1; margin-bottom:10px;
}

.about-body {
  font-family:var(--fb); font-size:15px; color:var(--dim2);
  line-height:1.75; max-width:660px;
}
.about-body + .about-body { margin-top:10px; }
.about-body b { color:var(--text); font-weight:600; }
.about-body em { color:var(--accent); font-style:normal; }

/* Formula block */
.formula-wrap {
  margin:14px 0;
  padding:16px 20px;
  background:var(--s2);
  border:1px solid var(--border);
  border-radius:10px;
  border-left:3px solid var(--accent);
}
.formula-title {
  font-family:var(--fc); font-size:9px; text-transform:uppercase;
  letter-spacing:2px; color:var(--dim); margin-bottom:10px;
}
.formula {
  font-family:'Courier New', monospace; font-size:14px;
  color:var(--text); line-height:1.9;
}
.formula .sym   { color:var(--accent); font-weight:700; }
.formula .frac  { display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; margin:0 4px; }
.formula .frac-n { border-bottom:1px solid var(--dim2); padding:0 4px; font-size:13px; line-height:1.4; }
.formula .frac-d { padding:0 4px; font-size:13px; line-height:1.4; color:var(--dim2); }
.formula-legend {
  margin-top:12px; display:flex; flex-direction:column; gap:4px;
}
.formula-legend-row {
  display:flex; gap:10px;
  font-family:var(--fc); font-size:11px; color:var(--dim2); line-height:1.4;
}
.formula-legend-sym { color:var(--accent); font-weight:700; width:80px; flex-shrink:0; }

/* K table */
.k-table {
  width:100%; border-collapse:collapse; margin:14px 0;
  font-family:var(--fc); font-size:12px;
}
.k-table th {
  text-align:left; padding:6px 10px;
  font-size:9px; text-transform:uppercase; letter-spacing:1.5px;
  color:var(--dim); border-bottom:1px solid var(--border);
  background:var(--s2);
}
.k-table td {
  padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.04);
  vertical-align:top;
}
.k-table tr:last-child td { border-bottom:none; }
.k-table tr:hover td { background:var(--s2); }
.k-val {
  font-family:var(--fd); font-size:20px; color:var(--accent);
  letter-spacing:1px; line-height:1;
}
.k-range { font-size:11px; color:var(--dim2); margin-top:2px; }
.k-why   { color:var(--dim2); line-height:1.5; font-size:11px; }
.k-why b { color:var(--text); }

/* Callout box */
.about-callout {
  margin:14px 0; padding:13px 15px; border-radius:8px;
  background:rgba(249,115,22,.06); border:1px solid rgba(249,115,22,.2);
  font-family:var(--fc); font-size:12px; color:var(--dim2); line-height:1.6;
}
.about-callout b { color:var(--text); }
.about-callout-title {
  font-family:var(--fc); font-size:10px; font-weight:700;
  text-transform:uppercase; letter-spacing:1.5px; color:var(--accent); margin-bottom:6px;
}

/* Scrollbar global */
* { scrollbar-width:thin; scrollbar-color:var(--border) transparent; }

/* ── Mobile-only elements: hidden by default; media query below overrides ── */
/* IMPORTANT: these must appear BEFORE the @media block so the media query wins */
.mobile-nav { display:none; }
.mobile-sheet-content { display:none; }
.mobile-footer { display:none; }

/* ── Desktop: sidebar hidden, main fills full width ───────────────────── */
@media (min-width: 768px) {
  .sidebar      { display:none !important; }
  .main-header  { display:none; }           /* replaced by top-nav */
  .mobile-mode  { display:none !important; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE LAYOUT  (≤ 767px)

   Layout zones (top → bottom, all in normal flow):
     .main-header         flex-shrink:0
     .arena-wrap          flex:1  (absorbs leftover space, centres content vertically)
       .arena             flex:0 0 auto  (content-sized — cards don't stretch)
       .vote-controls     flex-shrink:0  (skip · swipe hint on mobile / kbd hint on desktop)
     .k-bar               hidden on mobile  (k-factor info, desktop only)
     .mobile-footer       flex-shrink:0  (credits line)
     .mobile-nav          flex-shrink:0  56px

   Sidebar becomes a fixed sheet anchored above .mobile-nav.
   ═══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 767px) {

  body { overflow:hidden; }

  /* ── App shell ─────────────────────────────────────────────────────── */
  .app {
    flex-direction:column;
    height:100dvh;        /* use dvh for mobile address-bar safety */
    position:relative;
  }

  /* ── Sidebar → slide-up sheet ──────────────────────────────────────── */
  .sidebar {
    position:fixed; left:0; right:0; bottom:56px; /* sits above the nav */
    width:100%; min-width:unset;
    height:calc(100dvh - 56px);
    transform:translateY(100%);
    transition:transform .32s cubic-bezier(.4,0,.2,1);
    border-right:none; border-top:1px solid var(--border);
    border-radius:16px 16px 0 0; z-index:200;
  }
  .sidebar.sheet-open { transform:translateY(0); }

  /* Hide mode/brand sections from sidebar sheet — mode control is in the
     mobile-mode strip on the main vote screen */
  .sidebar .mode-section  { display:none; }
  .sidebar .brand-section { display:none; }

  /* Hide desktop-only sidebar chrome */
  .sb-top  { display:none; }
  .sb-tabs { display:none; }

  /* Hide synced ribbon on mobile entirely */
  .sb-footer { display:none; }

  /* ── Peek/drag handle ──────────────────────────────────────────────── */
  .sheet-peek {
    display:flex; align-items:center; justify-content:center;
    padding:10px 0 6px; cursor:pointer; flex-shrink:0;
  }
  .sheet-handle { width:36px; height:4px; border-radius:2px; background:var(--dim2); }

  /* ── Sheet content (About / Analysis) ──────────────────────────────── */
  .mobile-sheet-content {
    flex:1; overflow-y:auto; display:flex; flex-direction:column;
  }
  .mobile-sheet-content .analysis-area,
  .mobile-sheet-content .about-area {
    padding-bottom:16px;
  }

  .mode-section { padding:8px 12px 6px; }
  .brand-scroll { max-height:180px; }
  .bp-tags { display:none; }

  /* ── Main column ───────────────────────────────────────────────────── */
  .main {
    flex:1;                /* fill between header and nav */
    display:flex;
    flex-direction:column;
    overflow:hidden;
    min-height:0;          /* allow flex shrink */
  }

  .top-nav     { display:none; }
  .filter-bar  { display:none; }
  .main-header { padding:10px 14px 8px; flex-shrink:0; }
  .main-title  { font-size:22px; letter-spacing:2px; }

  /* Mode strip visible on mobile below main-header */
  .mobile-mode {
    display:flex; gap:5px; padding:4px 12px 8px; flex-shrink:0;
  }
  .mobile-mode .mode-pill { font-size:10px; padding:4px 10px; }

  /* arena-wrap fills .main and centres the card+skip+hint block */
  .arena-wrap {
    justify-content:center;  /* vertically centre the whole voting block */
  }

  /* ── Voting arena: side-by-side cards ──────────────────────────────── */
  .arena {
    flex:0 0 auto;        /* content-sized — no stretching */
    flex-direction:row;
    align-items:flex-start; /* cards wrap content, don't stretch tall */
    justify-content:center;
    padding:8px 6px;
    gap:0;
    overflow:hidden;
  }

  .card-col {
    flex:1; min-width:0; max-width:none;
    display:flex; flex-direction:column;
    /* no flex:1 on children — card just wraps its content */
  }

  .pedal-card {
    flex-direction:column;
    align-items:center;
    padding:10px 8px 10px;
    gap:6px;
    border-radius:12px;
    /* NO flex:1 — card is content-sized */
    overflow:hidden;
  }

  /* Images */
  .img-wrap  { width:120px; height:120px; flex-shrink:0; border-radius:8px; }
  .pedal-img { max-width:108px; max-height:108px; }
  .img-ph span { font-size:28px; }

  .pedal-meta   { text-align:center; }
  .pedal-name   { font-size:15px; }
  .pedal-brand  { font-size:10px; letter-spacing:2px; }
  .pedal-stats  { justify-content:center; gap:8px; }
  .ps-v         { font-size:13px; }
  .vote-hint    { display:none; }

  /* VS divider */
  .vs-wrap { flex-direction:column; padding:0 4px; width:30px; flex-shrink:0; }
  .vs-line { width:1px; height:40px; background:linear-gradient(to bottom,transparent,var(--border),transparent); }
  .vs-text { font-size:13px; }

  /* ── Vote controls: skip + swipe hint, centred column ──────────────── */
  .vote-controls {
    padding:10px 14px 6px;
    gap:8px;
  }
  .skip-btn {
    width:100%; max-width:280px; padding:10px; font-size:12px;
    letter-spacing:1.5px; border-radius:10px; text-align:center;
  }

  /* ── Swipe hint: visible on mobile ─────────────────────────────────── */
  .swipe-hint {
    display:flex; align-items:center; gap:14px;
    font-family:var(--fc); font-size:10px; color:var(--dim);
    text-transform:uppercase; letter-spacing:1px;
  }

  /* ── Desktop-only elements hidden ──────────────────────────────────── */
  .footer   { display:none; }
  .k-bar    { display:none; }
  .kbd-hint { display:none; }

  /* ── Mobile credits footer ─────────────────────────────────────────── */
  .mobile-footer {
    display:flex;
    flex-shrink:0;
    align-items:center;
    justify-content:center;
    padding:6px 14px;
    border-top:1px solid var(--border);
    background:var(--bg);
  }
  .mobile-footer-txt {
    font-family:var(--fc); font-size:10px; color:var(--dim);
    letter-spacing:.3px; text-align:center; line-height:1.4;
  }
  .mobile-footer-txt a {
    color:var(--accent); text-decoration:none;
  }

  /* ── Bottom navigation bar ─────────────────────────────────────────── */
  .mobile-nav {
    display:flex;
    flex-shrink:0; height:56px; width:100%;
    background:var(--s1); border-top:1px solid var(--border); z-index:300;
  }
  .mobile-nav-btn {
    flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:3px; cursor:pointer; background:transparent; border:none;
    font-family:var(--fc); font-size:9px; text-transform:uppercase; letter-spacing:1px;
    color:var(--dim); transition:color .15s; padding:0;
    -webkit-tap-highlight-color:transparent;
  }
  .mobile-nav-btn .nav-icon { font-size:18px; line-height:1; }
  .mobile-nav-btn.active    { color:var(--accent); }

  /* ── Narrow phones (< 360px): stacked cards ────────────────────────── */
  @media (max-width: 359px) {
    .arena       { flex-direction:column; padding:10px 10px 4px; align-items:stretch; }
    .card-col    { max-width:100%; width:100%; }
    .pedal-card  { flex-direction:row; gap:12px; padding:12px; }
    .img-wrap    { width:90px; height:90px; }
    .pedal-img   { max-width:80px; max-height:80px; }
    .pedal-meta  { text-align:left; }
    .pedal-stats { justify-content:flex-start; }
    .vs-wrap     { flex-direction:row; padding:6px 0; width:auto; align-self:auto; }
    .vs-line     { height:1px; width:100%; flex:1; background:linear-gradient(to right,transparent,var(--border),transparent); }
    .vs-text     { font-size:14px; }
  }
}
`;

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [pedals,         setPedals]         = useState([]);
  const [globalRankings, setGlobalRankings] = useState({});
  const [history,        setHistory]        = useState([]);
  const [globalVotes,    setGlobalVotes]    = useState(0);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [sidebarTab,  setSidebarTab]  = useState("vote");     // vote | rankings | analysis | about
  const [skipCount,   setSkipCount]   = useState(0);            // incremented to force new matchup
  const [mobileTab,   setMobileTab]   = useState("vote");     // vote | rankings | analysis | about
  const [mode,        setMode]        = useState("global");   // global | pool
  const [poolBrands,  setPoolBrands]  = useState(new Set());  // empty = all brands

  // ── Match state ───────────────────────────────────────────────────────────
  const [matchup,    setMatchup]    = useState(null);
  const [phase,      setPhase]      = useState("loading");
  const [winner,     setWinner]     = useState(null);
  const [deltas,     setDeltas]     = useState([]);
  const [syncStatus, setSyncStatus] = useState("ok");
  const [initError,  setInitError]  = useState(null);

  const recentIds   = useRef(new Set());
  const touchStart  = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured()) setSyncStatus("offline");
    async function init() {
      try {
        const [fetchedPedals, { globalData, history: hist }] = await Promise.all([
          fetchPedals(),
          loadAll(),
        ]);
        const blank = {};
        fetchedPedals.forEach((p) => { blank[p.id] = { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 }; });
        const merged = { ...blank, ...globalData.rankings };
        setPedals(fetchedPedals);
        setGlobalRankings(merged);
        setGlobalVotes(globalData.totalVotes ?? 0);
        setHistory(hist ?? []);
        setPhase("voting");
      } catch (err) {
        setInitError(err.message);
        setPhase("voting");
      }
    }
    init();
  }, []);

  // ── Active pool ───────────────────────────────────────────────────────────

  const activeRankings = useMemo(() => {
    return globalRankings;
  }, [globalRankings]);

  const activePedals = useMemo(() => {
    if (mode === "pool" && poolBrands.size > 0)
      return pedals.filter((p) => poolBrands.has(p.brand));
    return pedals;
  }, [mode, poolBrands, pedals]);

  const brands = useMemo(() => {
    const map = {};
    pedals.forEach((p) => { map[p.brand] = (map[p.brand] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pedals]);

  // ── Pick matchup whenever voting starts or config changes ─────────────────
  useEffect(() => {
    if (phase !== "voting" || activePedals.length < 2) return;

    const enrich = (p) => ({ ...p, elo: (activeRankings[p.id] ?? { elo: INITIAL_ELO }).elo });

    const pair = pickMatchup(activePedals.map(enrich), recentIds.current);
    if (pair) { setMatchup(pair); setWinner(null); }
  }, [phase, activePedals, skipCount]); // eslint-disable-line

  // ── Vote handler ──────────────────────────────────────────────────────────
  const handleVote = useCallback(
    (winnerPedal, loserPedal, evt) => {
      if (phase !== "voting") return;
      setPhase("reveal");
      setWinner(winnerPedal.id);

      const wStats = activeRankings[winnerPedal.id] ?? { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 };
      const lStats = activeRankings[loserPedal.id]  ?? { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 };
      const { newWinnerElo, newLoserElo, delta, eloGap } = calcElo(
        { ...wStats, id: winnerPedal.id },
        { ...lStats, id: loserPedal.id },
      );

      const newWStats = { elo: newWinnerElo, wins: wStats.wins + 1, losses: wStats.losses,     matches: wStats.matches + 1 };
      const newLStats = { elo: newLoserElo,  wins: lStats.wins,     losses: lStats.losses + 1, matches: lStats.matches + 1 };

      const record = {
        ts: Date.now(),
        mode: "global",
        winner: { id: winnerPedal.id, name: winnerPedal.name, brand: winnerPedal.brand, eloBefore: wStats.elo, eloAfter: newWinnerElo },
        loser:  { id: loserPedal.id,  name: loserPedal.name,  brand: loserPedal.brand,  eloBefore: lStats.elo, eloAfter: newLoserElo  },
        delta, eloGap,
      };

      // Update state + persist
      const newGR = { ...globalRankings, [winnerPedal.id]: newWStats, [loserPedal.id]: newLStats };
      const newGV = globalVotes + 1;
      setGlobalRankings(newGR);
      setGlobalVotes(newGV);
      setSyncStatus("saving");
      saveGlobal({ rankings: newGR, totalVotes: newGV });

      // History
      const newHistory = appendHistory(record, history);
      setHistory(newHistory);

      setTimeout(() => setSyncStatus("ok"), 1100);

      // Delta popups
      if (evt) {
        const rect   = evt.currentTarget.getBoundingClientRect();
        const cx     = rect.left + rect.width / 2;
        const cy     = rect.top  + rect.height / 2;
        const isLeft = winnerPedal.id === matchup[0].id;
        const lid    = Date.now();
        setDeltas((d) => [
          ...d,
          { id: lid,   x: cx,                   y: cy, val: `+${delta}`, cls: "pos" },
          { id: lid+1, x: isLeft ? cx+350 : cx-350, y: cy, val: `-${delta}`, cls: "neg" },
        ]);
        setTimeout(() => setDeltas((d) => d.filter((x) => x.id !== lid && x.id !== lid + 1)), 1200);
      }

      // Track recent
      recentIds.current.add(winnerPedal.id);
      recentIds.current.add(loserPedal.id);
      if (recentIds.current.size > 14) {
        const arr = [...recentIds.current];
        recentIds.current = new Set(arr.slice(-14));
      }

      setTimeout(() => setPhase("voting"), 850);
    },
    [phase, activeRankings, globalRankings, globalVotes, history, matchup],
  );

  // ── Keyboard shortcuts (desktop only) ───────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Only active on the voting screen; ignore if focus is in an input
      if (sidebarTab !== "vote") return;
      if (phase !== "voting") return;
      if (!matchup) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "ArrowLeft")  handleVote(matchup[0], matchup[1], null);
      if (e.key === "ArrowRight") handleVote(matchup[1], matchup[0], null);
      if (e.key === "ArrowDown")  { e.preventDefault(); recentIds.current = new Set(); setSkipCount((n) => n + 1); setPhase("voting"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarTab, phase, matchup, handleVote]); // eslint-disable-line

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm("Reset ALL rankings? This cannot be undone.")) return;
    const blank = {};
    pedals.forEach((p) => { blank[p.id] = { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 }; });
    setGlobalRankings(blank);
    setGlobalVotes(0);
    setHistory([]);
    recentIds.current = new Set();
    saveGlobal({ rankings: blank, totalVotes: 0 });
    setPhase("voting");
  };

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const leaderboard = useMemo(() => {
    return activePedals
      .map((p) => ({ ...p, ...(globalRankings[p.id] ?? { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 }) }))
      .sort((a, b) => b.elo - a.elo);
  }, [activePedals, globalRankings]);

  const ranked     = leaderboard.filter((p) => p.matches > 0);
  const unranked   = leaderboard.filter((p) => p.matches === 0);
  const totalVotes = globalVotes;

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <>
      <style>{CSS}</style>
      <div className="loading">
        <div className="loading-title"><b>ped</b>Elo</div>
        <div className="loading-sub">Loading the arsenal…</div>
      </div>
    </>
  );

  const [left, right] = matchup ?? [null, null];
  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className={`sidebar${mobileTab !== "vote" ? " sheet-open" : ""}`}>

          {/* Peek strip — tap to go back to voting on mobile */}
          <div className="sheet-peek" onClick={() => setMobileTab("vote")}>
            <div className="sheet-handle" />
          </div>

          <div className="sb-top">
            <div className="sb-logo"><b style={{letterSpacing:"3px"}}>ped</b>Elo<span style={{fontSize:"0.5em",letterSpacing:"2px",color:"var(--dim)",marginLeft:"6px",fontFamily:"var(--fc)",fontWeight:400,verticalAlign:"middle"}}>Pedal Elo</span></div>
            <div className="sb-sub">Guitar Pedal Rankings</div>
          </div>

          <div className="sb-tabs">
            <button className={`sb-tab ${sidebarTab === "rankings"  ? "active" : ""}`}  onClick={() => { setSidebarTab("rankings");  setMobileTab("rankings");  }}>Rankings</button>
            <button className={`sb-tab ${sidebarTab === "analysis" ? "active" : ""}`} onClick={() => { setSidebarTab("analysis"); setMobileTab("analysis"); }}>Analysis</button>
            <button className={`sb-tab ${sidebarTab === "about"    ? "active" : ""}`} onClick={() => { setSidebarTab("about");    setMobileTab("about");    }}>About</button>
          </div>

          {/* Brand Pool filter — mobile only, shown in rankings sheet */}
          {mode === "pool" && (
            <BrandPoolFilter
              brands={brands}
              poolBrands={poolBrands}
              setPoolBrands={setPoolBrands}
              onChanged={() => { recentIds.current = new Set(); setPhase("voting"); }}
            />
          )}



          {/* Rankings tab content — mobile only (desktop uses main rankings panel) */}
          {sidebarTab === "rankings" && (
            <>
              <div className="stat-row">
                <div className="stat"><div className="stat-v">{totalVotes.toLocaleString()}</div><div className="stat-l">Votes</div></div>
                <div className="stat"><div className="stat-v">{activePedals.length}</div><div className="stat-l">Pedals</div></div>
                <div className="stat"><div className="stat-v">{ranked.length}</div><div className="stat-l">Ranked</div></div>
              </div>
              <div className="lb-scroll">
                {ranked.length > 0 && (
                  <>
                    <div className="lb-head">Leaderboard</div>
                    {ranked.map((p, i) => <LbRow key={p.id} pedal={p} rank={i} />)}
                  </>
                )}
                {unranked.length > 0 && (
                  <div className="lb-head" style={{ marginTop: 8 }}>Awaiting matchup — {unranked.length}</div>
                )}
              </div>
            </>
          )}

          {/* Analysis tab — desktop: minimised sidebar, main area does the work */}
          {/* Mobile: full content shown in the sheet */}
          {sidebarTab === "analysis" && (
            <div className="mobile-sheet-content">
              <AnalysisPanel
                pedals={pedals}
                globalRankings={globalRankings}
                history={history}
                brands={brands}
              />
            </div>
          )}

          {/* About tab — desktop: minimised sidebar, main area does the work */}
          {/* Mobile: full content shown in the sheet */}
          {sidebarTab === "about" && (
            <div className="mobile-sheet-content">
              <AboutPanel />
            </div>
          )}

          <div className="sb-footer">
            <div className={`sync-ok sync-${syncStatus}`} style={{ display: "flex", alignItems: "center" }}>
              <div className="sync-dot" />
              <div className="sync-txt">
                { { ok: "Synced", saving: "Saving…", error: "Sync error", offline: "Offline (no Redis)" }[syncStatus] }
              </div>
            </div>
            {initError && <div style={{ fontFamily: "var(--fc)", fontSize: 10, color: "var(--red)" }}>⚠ {initError}</div>}
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────── */}
        <main className="main">

          {/* Desktop top-nav ─────────────────────────────────────────── */}
          <header className="top-nav">
            <span className="top-nav-logo"><b>ped</b>Elo<span style={{fontSize:"0.65em",letterSpacing:"2px",color:"var(--dim)",marginLeft:"8px",fontFamily:"var(--fc)",fontWeight:400}}>Pedal Elo</span></span>
            <nav className="top-nav-tabs">
              {[["vote","Vote"],["rankings","Rankings"],["analysis","Analysis"],["about","About"]].map(([id, lbl]) => (
                <button key={id} className={`top-nav-tab${sidebarTab === id ? " active" : ""}`}
                  onClick={() => { setSidebarTab(id); setMobileTab(id === "vote" ? "vote" : id); }}>
                  {lbl}
                </button>
              ))}
            </nav>
            <div className="top-nav-right">
              {sidebarTab === "vote" && (
                <div className="top-nav-mode">
                  {[["global","All Pedals"],["pool","Brand Pool"]].map(([m, lbl]) => (
                    <div key={m} className={`top-nav-pill${mode === m ? " active" : ""}`}
                      onClick={() => { setMode(m); recentIds.current = new Set(); setPhase("voting"); }}>
                      {lbl}
                    </div>
                  ))}
                </div>
              )}
              <div className={`top-nav-sync sync-${syncStatus}`}>
                <div className="sync-dot" />
                <div className="sync-txt">{ { ok:"Synced", saving:"Saving…", error:"Sync error", offline:"Offline" }[syncStatus] }</div>
              </div>
              {import.meta.env.VITE_ALLOW_RESET === "true" && (
                <button className="reset-btn" style={{ margin:0 }} onClick={handleReset}>↺ Reset</button>
              )}
            </div>
          </header>

          {/* Desktop brand pool filter bar ───────────────────────────── */}
          {mode === "pool" && sidebarTab === "vote" && (
            <div className="filter-bar">
              <BrandPoolFilter
                brands={brands}
                poolBrands={poolBrands}
                setPoolBrands={setPoolBrands}
                onChanged={() => { recentIds.current = new Set(); setPhase("voting"); }}
              />
            </div>
          )}

          {/* Mobile main-header ──────────────────────────────────────── */}
          <div className="main-header">
            <div className="main-title">CHOOSE YOUR <em>WEAPON</em></div>
            <div className="round-pill">Round {totalVotes + 1}</div>
          </div>

          {/* Mobile mode strip ───────────────────────────────────────── */}
          <div className="mobile-mode">
            {[["global","All Pedals"],["pool","Brand Pool"]].map(([m, lbl]) => (
              <div key={m} className={`mode-pill${mode === m ? " active" : ""}`}
                onClick={() => { setMode(m); recentIds.current = new Set(); setPhase("voting"); }}>
                {lbl}
              </div>
            ))}
          </div>

          {sidebarTab === "analysis" ? (
            <AnalysisPanel
              pedals={pedals}
              globalRankings={globalRankings}
              history={history}
              brands={brands}
            />
          ) : sidebarTab === "about" ? (
            <AboutPanel />
          ) : sidebarTab === "rankings" ? (
            <div className="rankings-panel">
              <div className="stat-row">
                <div className="stat"><div className="stat-v">{totalVotes.toLocaleString()}</div><div className="stat-l">Votes</div></div>
                <div className="stat"><div className="stat-v">{activePedals.length}</div><div className="stat-l">Pedals</div></div>
                <div className="stat"><div className="stat-v">{ranked.length}</div><div className="stat-l">Ranked</div></div>
              </div>
              <div className="lb-scroll">
                <div className="lb-scroll-inner">
                  {ranked.length > 0 && (
                    <>
                      <div className="lb-head">Leaderboard</div>
                      {ranked.map((p, i) => <LbRow key={p.id} pedal={p} rank={i} />)}
                    </>
                  )}
                  {unranked.length > 0 && (
                    <div className="lb-head" style={{ marginTop: 8 }}>Awaiting matchup — {unranked.length}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                className="arena-wrap"
                onTouchStart={(e) => {
                  touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }}
                onTouchEnd={(e) => {
                  if (!touchStart.current || !matchup || phase !== "voting") return;
                  const dx = e.changedTouches[0].clientX - touchStart.current.x;
                  const dy = e.changedTouches[0].clientY - touchStart.current.y;
                  touchStart.current = null;
                  if (Math.abs(dx) < 50 && Math.abs(dy) < 50) return; // too short
                  if (Math.abs(dx) >= Math.abs(dy)) {
                    // Horizontal swipe: swipe right = vote right pedal, swipe left = vote left
                    if (dx > 0) handleVote(matchup[1], matchup[0], null);
                    else        handleVote(matchup[0], matchup[1], null);
                  } else if (dy > 0) {
                    // Swipe down = skip
                    recentIds.current = new Set(); setSkipCount((n) => n + 1); setPhase("voting");
                  }
                }}
              >
              <div className="arena">
                {activePedals.length < 2 ? (
                  <div className="empty-state">
                    <div className="empty-inner">
                      <div className="empty-icon">🎸</div>
                      <div className="empty-msg">Not enough pedals</div>
                      <div className="empty-sub">Select more brands in Brand Pool to continue</div>
                    </div>
                  </div>
                ) : left && right ? (
                  <>
                    <div className="card-col">
                      <PedalCard
                        pedal={left}
                        stats={activeRankings[left.id]}
                        status={winner ? (left.id === winner ? "winner" : "loser") : ""}
                        onClick={(e) => handleVote(left, right, e)}
                      />
                    </div>
                    <div className="vs-wrap">
                      <div className="vs-line" />
                      <div className="vs-text">VS</div>
                      <div className="vs-line" />
                    </div>
                    <div className="card-col">
                      <PedalCard
                        pedal={right}
                        stats={activeRankings[right.id]}
                        status={winner ? (right.id === winner ? "winner" : "loser") : ""}
                        onClick={(e) => handleVote(right, left, e)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-inner">
                      <div className="empty-icon">⟳</div>
                      <div className="empty-msg">Loading matchup…</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="vote-controls">
                <button className="skip-btn" onClick={() => { recentIds.current = new Set(); setSkipCount((n) => n + 1); setPhase("voting"); }}>Skip matchup</button>
                {/* Keyboard hints — desktop only */}
                <div className="kbd-hint">
                  <span className="kbd-hint-label">Keyboard:</span>
                  <div className="kbd-item"><kbd className="kbd">←</kbd> Vote left</div>
                  <div className="kbd-item"><kbd className="kbd">→</kbd> Vote right</div>
                  <div className="kbd-item"><kbd className="kbd">↓</kbd> Skip</div>
                </div>
                {/* Swipe hints — mobile only */}
                <div className="swipe-hint">
                  <span>⟵ Vote left</span>
                  <span>·</span>
                  <span>Vote right ⟶</span>
                  <span>·</span>
                  <span>↓ Skip</span>
                </div>
              </div>

              </div>{/* end arena-wrap */}
            </>
          )}

          {/* K-factor info — desktop only, vote tab only */}
          {sidebarTab === "vote" && <div className="k-bar">
            <div className="k-note">
              K-factors:&nbsp;
              <b>{left  ? getK((activeRankings[left.id]  ?? {matches:0}).matches) : "—"}</b>
              &nbsp;/&nbsp;
              <b>{right ? getK((activeRankings[right.id] ?? {matches:0}).matches) : "—"}</b>
              &nbsp;— higher = faster rating movement for new pedals
            </div>
          </div>}

          <footer className="footer">
            <div className="footer-txt">Made by <a href="https://www.linkedin.com/in/jeremydabramson/" target="_blank" rel="noopener noreferrer">Jeremy Abramson</a></div>
            <div className="footer-txt">
              Pedal data &amp; images from&nbsp;
              <a href="https://github.com/PedalPlayground/pedalplayground" target="_blank" rel="noopener noreferrer">
                PedalPlayground
              </a>
            </div>
          </footer>
        </main>

        {/* ── Mobile credits footer ─────────────────────────────────── */}
        <div className="mobile-footer">
          <div className="mobile-footer-txt">
            PedElo: Developed by{" "}
            <a href="https://www.linkedin.com/in/jeremydabramson/" target="_blank" rel="noopener noreferrer">Jeremy Abramson</a>
            , with data from{" "}
            <a href="https://github.com/PedalPlayground/pedalplayground" target="_blank" rel="noopener noreferrer">PedalPlayground</a>
          </div>
        </div>

        {/* ── Mobile bottom nav ───────────────────────────────────────── */}
        <nav className="mobile-nav">
          {[
            { id: "vote",     icon: "⚔",  label: "Vote"     },
            { id: "rankings", icon: "🏆",  label: "Rankings" },
            { id: "analysis", icon: "📊",  label: "Analysis" },
            { id: "about",    icon: "📖",  label: "About"    },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={`mobile-nav-btn${mobileTab === id ? " active" : ""}`}
              onClick={() => {
                if (id === "vote" || id === mobileTab) {
                  // Vote tab OR tapping the already-active tab: retract sheet
                  setMobileTab("vote");
                  setSidebarTab("vote");
                } else {
                  // Open sheet to this panel
                  setMobileTab(id);
                  setSidebarTab(id);
                }
              }}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {deltas.map((d) => (
        <div key={d.id} className={`delta ${d.cls}`} style={{ left: d.x, top: d.y }}>{d.val}</div>
      ))}
    </>
  );
}

// ─── Brand Pool Filter ───────────────────────────────────────────────────────

function BrandPoolFilter({ brands, poolBrands, setPoolBrands, onChanged }) {
  const [query, setQuery]   = useState("");
  const [open,  setOpen]    = useState(false);
  const inputRef            = useRef(null);
  const wrapRef             = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands
      .filter(([b]) => !poolBrands.has(b) && (!q || b.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [brands, poolBrands, query]);

  function add(brand) {
    setPoolBrands((prev) => new Set([...prev, brand]));
    setQuery("");
    onChanged();
    inputRef.current?.focus();
  }

  function remove(brand) {
    setPoolBrands((prev) => { const n = new Set(prev); n.delete(brand); return n; });
    onChanged();
  }

  function clearAll() {
    setPoolBrands(new Set());
    setQuery("");
    onChanged();
  }

  const selectedList = [...poolBrands].sort();
  const label = poolBrands.size === 0
    ? "Brand Pool · votes count globally"
    : `${poolBrands.size} brand${poolBrands.size > 1 ? "s" : ""} selected · votes count globally`;

  return (
    <div className="brand-section">
      <div className="brand-label">{label}</div>

      {/* Search input */}
      <div className="bp-search-wrap" ref={wrapRef}>
        <input
          ref={inputRef}
          className="bp-input"
          placeholder="Search brands…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length > 0) add(filtered[0][0]);
            if (e.key === "Escape") { setOpen(false); setQuery(""); }
          }}
        />
        {(query || poolBrands.size > 0) && (
          <button className="bp-clear" onClick={clearAll} title="Clear all">✕</button>
        )}

        {/* Dropdown */}
        {open && (
          <div className="bp-dropdown">
            {filtered.length > 0 ? filtered.map(([brand, count]) => (
              <div key={brand} className="bp-dropdown-item" onMouseDown={() => add(brand)}>
                <span>{brand}</span>
                <span className="bp-dropdown-item-count">{count}</span>
              </div>
            )) : (
              <div className="bp-dropdown-empty">
                {poolBrands.size > 0 && query === "" ? "All matching brands selected" : "No brands found"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected brand pills (desktop only via CSS) */}
      {selectedList.length > 0 ? (
        <div className="bp-tags">
          {selectedList.map((brand) => (
            <div key={brand} className="bp-tag">
              <span className="bp-tag-name">{brand}</span>
              <button className="bp-tag-remove" onMouseDown={() => remove(brand)}>×</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bp-all-msg">All brands included</div>
      )}
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LbRow({ pedal, rank }) {
  const [imgOk, setImgOk] = useState(true);
  const medals = ["🥇","🥈","🥉"];
  const cls    = rank === 0 ? "gold" : rank === 1 ? "silver" : rank === 2 ? "bronze" : "";
  const label  = rank < 3 ? medals[rank] : `#${rank + 1}`;
  return (
    <div className="lb-row">
      <div className={`lb-rank ${cls}`}>{label}</div>
      {imgOk && pedal.image
        ? <img className="lb-thumb" src={pedal.image} alt={pedal.name} referrerPolicy="no-referrer" loading="lazy" onError={() => setImgOk(false)} />
        : <div className="lb-thumb-ph">🎸</div>
      }
      <div className="lb-info">
        <div className="lb-name">{pedal.name}</div>
        <div className="lb-brand">{pedal.brand}</div>
      </div>
      <div className="lb-right">
        <div className="lb-elo">{pedal.elo}</div>
        <div className="lb-m">{pedal.matches}↔</div>
      </div>
    </div>
  );
}

// ─── Pedal card ───────────────────────────────────────────────────────────────

function PedalCard({ pedal, stats, status, onClick }) {
  const [imgOk, setImgOk] = useState(true);
  const s       = stats ?? { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 };
  const winRate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : null;
  return (
    <div className={`pedal-card ${status}`} onClick={status === "loser" ? undefined : onClick}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && status !== "loser") onClick(e); }}>
      <div className="img-wrap">
        {imgOk && pedal.image
          ? <img className="pedal-img" src={pedal.image} alt={pedal.name} referrerPolicy="no-referrer" loading="lazy" onError={() => setImgOk(false)} />
          : <div className="img-ph"><span>🎸</span>No image</div>
        }
      </div>
      <div className="pedal-meta">
        {pedal.brand && <div className="pedal-brand">{pedal.brand}</div>}
        <div className="pedal-name">{pedal.name}</div>
        <div className="pedal-stats">
          <div><div className="ps-v">{s.elo}</div><div className="ps-l">Elo</div></div>
          <div><div className="ps-v">{s.matches}</div><div className="ps-l">Matches</div></div>
          {winRate !== null && (
            <div>
              <div className="ps-v" style={{ color: winRate >= 50 ? "var(--green)" : "var(--red)" }}>{winRate}%</div>
              <div className="ps-l">Win Rate</div>
            </div>
          )}
        </div>
      </div>
      <div className="vote-hint">Click to vote</div>
    </div>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────────────

function AnalysisPanel({ pedals, globalRankings, history, brands }) {
  const [search,       setSearch]       = useState("");
  const [listMode,     setListMode]     = useState("top"); // top | bottom | search
  const [filterBrands, setFilterBrands] = useState(new Set());
  const [listN,        setListN]        = useState(10);

  // Build enriched + sorted pedal list
  const allRanked = useMemo(() =>
    pedals
      .map((p) => ({ ...p, ...(globalRankings[p.id] ?? { elo: INITIAL_ELO, wins: 0, losses: 0, matches: 0 }) }))
      .filter((p) => p.matches > 0)
      .sort((a, b) => b.elo - a.elo)
      .map((p, i) => ({ ...p, rank: i + 1 })),
    [pedals, globalRankings]
  );

  // Filter by selected brands
  const brandFiltered = useMemo(() =>
    filterBrands.size > 0 ? allRanked.filter((p) => filterBrands.has(p.brand)) : allRanked,
    [allRanked, filterBrands]
  );

  // Explorer results
  const explorerRows = useMemo(() => {
    if (listMode === "search") {
      const q = search.toLowerCase();
      return brandFiltered.filter((p) =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      ).slice(0, 30);
    }
    if (listMode === "bottom") return [...brandFiltered].reverse().slice(0, listN);
    return brandFiltered.slice(0, listN);
  }, [brandFiltered, listMode, search, listN]);

  // Brand report
  const brandReport = useMemo(() => {
    const map = {};
    allRanked.forEach((p) => {
      if (!map[p.brand]) map[p.brand] = { brand: p.brand, pedals: [], totalElo: 0 };
      map[p.brand].pedals.push(p);
      map[p.brand].totalElo += p.elo;
    });
    return Object.values(map)
      .map((b) => ({
        brand:   b.brand,
        count:   b.pedals.length,
        avgElo:  Math.round(b.totalElo / b.pedals.length),
        topPedal: b.pedals[0],
        wins:    b.pedals.reduce((s, p) => s + p.wins, 0),
        matches: b.pedals.reduce((s, p) => s + p.matches, 0),
      }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.avgElo - a.avgElo);
  }, [allRanked]);

  const maxBrandElo = brandReport[0]?.avgElo ?? INITIAL_ELO;

  // Most contested (win rate near 50%, ≥8 matches)
  const contested = useMemo(() =>
    allRanked
      .filter((p) => p.matches >= 8)
      .map((p) => ({ ...p, winRate: p.wins / p.matches }))
      .sort((a, b) => Math.abs(a.winRate - 0.5) - Math.abs(b.winRate - 0.5))
      .slice(0, 8),
    [allRanked]
  );

  // Recent global history
  const recentGlobal = useMemo(() =>
    history.filter((h) => h.mode === "global").slice(0, 20),
    [history]
  );

  // Biggest upsets (underdog won — negative eloGap means winner had lower Elo)
  const upsets = useMemo(() =>
    history
      .filter((h) => h.eloGap < -50) // winner's Elo was at least 50 below loser's
      .sort((a, b) => a.eloGap - b.eloGap) // most extreme first
      .slice(0, 6),
    [history]
  );

  const noData = allRanked.length === 0;

  return (
    <div className="analysis-area">
      {noData && (
        <div className="a-card">
          <div className="a-card-body" style={{ textAlign: "center", padding: "32px", fontFamily: "var(--fc)", color: "var(--dim)", fontSize: 13 }}>
            No ranked pedals yet — cast some votes first!
          </div>
        </div>
      )}

      {/* ── Explorer ── */}
      <div className="a-card">
        <div className="a-card-head"><span className="accent">◆</span> Rankings Explorer</div>
        <div className="a-card-body">
          <div className="explorer-controls">
            <input
              className="a-search"
              placeholder="Search by name or brand…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setListMode("search"); }}
            />
            <div className="tog-group">
              {[["top","Top"],["bottom","Bottom"],["search","Search"]].map(([m, lbl]) => (
                <button key={m} className={`tog ${listMode === m ? "active" : ""}`} onClick={() => setListMode(m)}>{lbl}</button>
              ))}
            </div>
            {listMode !== "search" && (
              <div className="tog-group">
                {[10, 20, 50].map((n) => (
                  <button key={n} className={`tog ${listN === n ? "active" : ""}`} onClick={() => setListN(n)}>{n}</button>
                ))}
              </div>
            )}
          </div>

          {/* Brand filter chips */}
          <div className="explorer-brands">
            {brands.map(([brand]) => (
              <div key={brand}
                className={`ebrand-chip ${filterBrands.has(brand) ? "active" : ""}`}
                onClick={() => setFilterBrands((prev) => {
                  const next = new Set(prev);
                  prev.has(brand) ? next.delete(brand) : next.add(brand);
                  return next;
                })}>
                {brand}
              </div>
            ))}
          </div>

          {explorerRows.length > 0 ? (
            <table className="pedal-table">
              <thead>
                <tr>
                  <th>#</th><th></th><th>Pedal</th><th>Brand</th>
                  <th className="r">Elo</th><th className="r">Matches</th><th className="r">Win %</th>
                </tr>
              </thead>
              <tbody>
                {explorerRows.map((p) => {
                  const wr = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : null;
                  return (
                    <tr key={p.id}>
                      <td className="td-rank">{p.rank}</td>
                      <td className="td-thumb"><ThumbImg pedal={p} size={24} /></td>
                      <td className="td-name">{p.name}</td>
                      <td className="td-brand">{p.brand}</td>
                      <td className="td-elo r">{p.elo}</td>
                      <td className="r" style={{ color: "var(--dim2)" }}>{p.matches}</td>
                      <td className={`td-wr r ${wr >= 50 ? "up" : "dn"}`}>{wr !== null ? `${wr}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ fontFamily: "var(--fc)", fontSize: 12, color: "var(--dim)", padding: "12px 0" }}>
              {noData ? "No data yet" : "No matches found"}
            </div>
          )}
        </div>
      </div>

      <div className="analysis-grid">
        {/* ── Brand Report ── */}
        <div className="a-card">
          <div className="a-card-head"><span className="accent">◆</span> Brand Report</div>
          <div className="a-card-body">
            {brandReport.length > 0 ? (
              <table className="brand-table">
                <thead>
                  <tr><th>Brand</th><th className="r">Avg Elo</th><th className="r">Ranked</th><th>Strength</th></tr>
                </thead>
                <tbody>
                  {brandReport.map((b) => (
                    <tr key={b.brand}>
                      <td style={{ fontWeight: 700 }}>{b.brand}</td>
                      <td className="r" style={{ color: "var(--accent)", fontWeight: 700 }}>{b.avgElo}</td>
                      <td className="r" style={{ color: "var(--dim2)" }}>{b.count}</td>
                      <td>
                        <div className="brand-bar-wrap">
                          <div className="brand-bar" style={{ width: `${Math.round((b.avgElo / maxBrandElo) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontFamily: "var(--fc)", fontSize: 12, color: "var(--dim)" }}>No data yet</div>
            )}
          </div>
        </div>

        {/* ── Most Contested ── */}
        <div className="a-card">
          <div className="a-card-head"><span className="accent">◆</span> Most Contested
            <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 400, marginLeft: 4 }}>win rate nearest 50%</span>
          </div>
          <div className="a-card-body">
            {contested.length > 0 ? contested.map((p) => {
              const wr = Math.round(p.winRate * 100);
              return (
                <div key={p.id} className="contested-item">
                  <ThumbImg pedal={p} size={26} />
                  <div className="contested-info">
                    <div className="contested-name">{p.name}</div>
                    <div className="contested-brand">{p.brand} · {p.matches} matches</div>
                  </div>
                  <div className="contested-bar-wrap">
                    <div className="contested-bar-track">
                      <div className="contested-bar-fill" style={{ width: `${wr}%` }} />
                    </div>
                    <div className="contested-pct">{wr}% wins</div>
                  </div>
                  <div className="contested-elo">{p.elo}</div>
                </div>
              );
            }) : (
              <div style={{ fontFamily: "var(--fc)", fontSize: 12, color: "var(--dim)" }}>
                Need ≥8 matches per pedal — keep voting!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="analysis-grid">
        {/* ── Recent Matches ── */}
        <div className="a-card">
          <div className="a-card-head"><span className="accent">◆</span> Recent Matches</div>
          <div className="a-card-body">
            {recentGlobal.length > 0 ? recentGlobal.map((r, i) => (
              <div key={i} className="history-item">
                <div className="history-winner">{r.winner.name}</div>
                <div className="history-beat">beat</div>
                <div className="history-loser">{r.loser.name}</div>
                <div className="history-delta">+{r.delta}</div>
              </div>
            )) : (
              <div style={{ fontFamily: "var(--fc)", fontSize: 12, color: "var(--dim)" }}>No match history yet</div>
            )}
          </div>
        </div>

        {/* ── Biggest Upsets ── */}
        <div className="a-card">
          <div className="a-card-head"><span className="accent">◆</span> Biggest Upsets
            <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 400, marginLeft: 4 }}>underdog wins</span>
          </div>
          <div className="a-card-body">
            {upsets.length > 0 ? upsets.map((r, i) => (
              <div key={i} className="history-item">
                <div className="history-winner">{r.winner.name}</div>
                <div className="history-beat">upset</div>
                <div className="history-loser">{r.loser.name}</div>
                <div style={{ color: "var(--gold)", fontFamily: "var(--fc)", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  −{Math.abs(r.eloGap)} gap
                </div>
              </div>
            )) : (
              <div style={{ fontFamily: "var(--fc)", fontSize: 12, color: "var(--dim)" }}>
                No major upsets recorded yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── About Panel ─────────────────────────────────────────────────────────────

function AboutPanel() {
  return (
    <div className="about-area">

      {/* ── Intro ── */}
      <div className="about-section">
        <div className="about-section-label">What is this?</div>
        <div className="about-h1">THE <em>Elo</em> SYSTEM</div>
        <div className="about-body">
          Elo is a method for ranking competitors based on the outcomes of head-to-head matchups.
          It was invented by physicist <b>Arpad Elo</b> in the 1960s for ranking chess players,
          and has since been adopted by everything from football leagues to video games to dating apps.
          The core idea is simple: <em>your rating goes up when you beat someone, down when you lose,
          and the amount it moves depends on how surprising the result was.</em>
        </div>
        <div className="about-body" style={{ marginTop: 10 }}>
          Beating someone rated far above you earns a lot of points — it was unlikely.
          Beating someone rated far below you earns almost nothing — it was expected.
          This means ratings naturally converge on a stable, accurate ordering given enough matchups.
        </div>
      </div>

      {/* ── The Formula ── */}
      <div className="about-section">
        <div className="about-section-label">The Formula</div>
        <div className="about-h2">Expected Score</div>
        <div className="about-body">
          Before any matchup, Elo calculates each player's probability of winning based on
          the difference in their ratings. This is called the <b>expected score</b>:
        </div>

        <div className="formula-wrap">
          <div className="formula-title">Expected score for Player A</div>
          <div className="formula">
            <span className="sym">E<sub>A</sub></span> =
            <span className="frac">
              <span className="frac-n">1</span>
              <span className="frac-d">1 + 10<sup>(R<sub>B</sub> − R<sub>A</sub>) / 400</sup></span>
            </span>
          </div>
          <div className="formula-legend">
            <div className="formula-legend-row">
              <span className="formula-legend-sym">E<sub>A</sub></span>
              <span>Probability that A wins, expressed as a number between 0 and 1</span>
            </div>
            <div className="formula-legend-row">
              <span className="formula-legend-sym">R<sub>A</sub>, R<sub>B</sub></span>
              <span>Current Elo ratings of players A and B</span>
            </div>
            <div className="formula-legend-row">
              <span className="formula-legend-sym">400</span>
              <span>Scale constant — a 400-point gap means the higher-rated player wins ~91% of the time</span>
            </div>
          </div>
        </div>

        <div className="about-h2" style={{ marginTop: 16 }}>Rating Update</div>
        <div className="about-body">
          After the matchup, ratings are updated. The winner gains points, the loser loses the same amount:
        </div>

        <div className="formula-wrap">
          <div className="formula-title">New rating after a match</div>
          <div className="formula">
            <span className="sym">R′<sub>A</sub></span> = <span className="sym">R<sub>A</sub></span> + <span className="sym">K</span> × (<span className="sym">S<sub>A</sub></span> − <span className="sym">E<sub>A</sub></span>)
          </div>
          <div className="formula-legend">
            <div className="formula-legend-row">
              <span className="formula-legend-sym">R′<sub>A</sub></span>
              <span>A's new rating after the match</span>
            </div>
            <div className="formula-legend-row">
              <span className="formula-legend-sym">K</span>
              <span>The K-factor — controls how much a single result can move the rating (see below)</span>
            </div>
            <div className="formula-legend-row">
              <span className="formula-legend-sym">S<sub>A</sub></span>
              <span>Actual result: 1 if A won, 0 if A lost</span>
            </div>
            <div className="formula-legend-row">
              <span className="formula-legend-sym">E<sub>A</sub></span>
              <span>Expected score calculated above — the probability A was supposed to win</span>
            </div>
          </div>
        </div>

        <div className="about-callout">
          <div className="about-callout-title">A worked example</div>
          A Boss DS-1 (rated <b>1200</b>) faces an Ibanez TS9 (rated <b>1280</b>).
          The DS-1's expected score is <b>1 / (1 + 10^(80/400)) ≈ 0.39</b> — it's the underdog.
          If the DS-1 wins and K = 64, it gains <b>64 × (1 − 0.39) ≈ +39 points</b>.
          If it loses, it drops <b>64 × (0 − 0.39) ≈ −25 points</b>.
          The asymmetry is intentional: upsets are rewarded more than expected wins.
        </div>
      </div>

      {/* ── K Factor ── */}
      <div className="about-section">
        <div className="about-section-label">The K-Factor</div>
        <div className="about-h2">Controlling Volatility</div>
        <div className="about-body">
          The <b>K-factor</b> is the single most important tuning parameter in Elo.
          It controls how dramatically a single result can shift a rating.
          A high K means ratings move fast — good for establishing a position quickly,
          but vulnerable to noise. A low K means ratings are stable — harder to manipulate,
          but slow to correct errors.
        </div>
        <div className="about-body" style={{ marginTop: 10 }}>
          This app uses a <em>tiered K-factor</em> that changes as a pedal accumulates more matchups,
          borrowing from how FIDE (the international chess federation) handles new vs. established players:
        </div>

        <table className="k-table">
          <thead>
            <tr>
              <th>K</th>
              <th>Matches played</th>
              <th>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="k-val">64</div>
                <div className="k-range">0 – 29 matches</div>
              </td>
              <td style={{ color: "var(--dim2)", fontFamily: "var(--fc)", fontSize: 12 }}>New pedal</td>
              <td className="k-why">
                A brand-new pedal needs to find its true level <b>fast</b>. Starting at 1200, it could easily
                face a run of mismatched opponents. High K means the rating moves aggressively toward
                where it belongs rather than getting stuck near the starting line from a few bad early draws.
              </td>
            </tr>
            <tr>
              <td>
                <div className="k-val">32</div>
                <div className="k-range">30 – 99 matches</div>
              </td>
              <td style={{ color: "var(--dim2)", fontFamily: "var(--fc)", fontSize: 12 }}>Settling in</td>
              <td className="k-why">
                The rating is now in the right neighbourhood. K=32 — the standard FIDE rate for most
                competitive players — keeps the rating <b>responsive to genuine upsets</b> without making
                it thrash around from random variance.
              </td>
            </tr>
            <tr>
              <td>
                <div className="k-val">16</div>
                <div className="k-range">100+ matches</div>
              </td>
              <td style={{ color: "var(--dim2)", fontFamily: "var(--fc)", fontSize: 12 }}>Established</td>
              <td className="k-why">
                A pedal with 100+ votes has a <b>well-evidenced rating</b> built from broad community input.
                Low K protects that signal from being manipulated by a sudden streak of biased votes or
                an unusual run of weak opponents. Moving the needle now takes sustained, repeated pressure.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Crowdsourcing ── */}
      <div className="about-section">
        <div className="about-section-label">This app's methodology</div>
        <div className="about-h2">Crowdsourced Ranking</div>
        <div className="about-body">
          Traditional Elo assumes a single consistent rater. Here, thousands of different people
          with different tastes vote — which introduces noise that a standard K-factor schedule
          doesn't account for. The tiered schedule above is specifically designed to handle this:
        </div>
        <div className="about-body" style={{ marginTop: 10 }}>
          The high early K (64) means the <b>wisdom of the crowd converges quickly</b> in the early
          stages rather than a few idiosyncratic early votes permanently anchoring a pedal at the
          wrong level. Once enough votes have accumulated, the low K (16) means the final rating
          represents a stable consensus that a single contrarian voter can't meaningfully disrupt.
        </div>

        <div className="about-callout" style={{ marginTop: 14 }}>
          <div className="about-callout-title">Matchmaking</div>
          Matchups are never random. The algorithm always pairs pedals from <b>different brands</b>.
          Early on, when ratings are still converging, matchups are drawn randomly across the full
          catalogue — pure exploration. Once the community has cast enough votes that ratings have
          meaningfully diverged, the algorithm switches to <b>seeded pairing</b>: pedals are sorted
          by rating and matched close in rank, similar to how chess tournaments are structured, so
          both outcomes are plausible and every vote moves the needle meaningfully. The switch
          happens automatically.
        </div>

        <div className="about-callout" style={{ marginTop: 10, background: "rgba(96,165,250,.07)", borderColor: "rgba(96,165,250,.2)" }}>
          <div className="about-callout-title" style={{ color: "var(--blue)" }}>Brand Pool — focused voting, global impact</div>
          With over 8,000 pedals in the database, most voters have only played a fraction of them.
          Brand Pool lets you filter matchups to brands you actually know, so your votes reflect{" "}
          <b>real experience rather than guesswork</b>. Those votes still count toward the global
          leaderboard — focused expertise from people who know a brand well is exactly the signal
          that makes the rankings meaningful.
        </div>
      </div>

      {/* ── Credits ── */}
      <div className="about-section" style={{ borderBottom: "none" }}>
        <div className="about-section-label">Credits</div>
        <div className="about-body">
          Built by <b><a href="https://www.linkedin.com/in/jeremydabramson/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Jeremy Abramson</a></b>. Pedal data and images from the{" "}
          <a href="https://github.com/PedalPlayground/pedalplayground"
            target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}>
            PedalPlayground
          </a>{" "}
          open source project. Elo methodology based on the work of Arpad Elo, as standardised
          by FIDE for competitive chess.
        </div>
      </div>

    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function ThumbImg({ pedal, size = 28 }) {
  const [ok, setOk] = useState(true);
  const s = { width: size, height: size, borderRadius: 4, objectFit: "contain", background: "var(--s2)", border: "1px solid var(--border)", padding: 1, flexShrink: 0 };
  return ok && pedal.image
    ? <img style={s} src={pedal.image} alt={pedal.name} referrerPolicy="no-referrer" loading="lazy" onError={() => setOk(false)} />
    : <div style={{ ...s, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55 }}>🎸</div>;
}
