#!/usr/bin/env node
// Pull a conference schedule from Sessionize and write <dir>/schedule.json.
//
//   node scripts/pull-sessionize.js kubecon-na-2026
//   node scripts/pull-sessionize.js kubecon-na-2026 --input feed.json
//
// Rules for what to include live in <dir>/sessionize.config.js. Output has no
// timestamps, so pulling an unchanged schedule leaves the file unchanged.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [dir, ...rest] = process.argv.slice(2);
if (!dir) {
  console.error("usage: pull-sessionize.js <conference-dir> [--input file]");
  process.exit(1);
}
const inputIdx = rest.indexOf("--input");
const input = inputIdx >= 0 ? rest[inputIdx + 1] : null;

const confDir = resolve(dir);
const { default: config } = await import(
  pathToFileURL(resolve(confDir, "sessionize.config.js"))
);

const url = `https://sessionize.com/api/v2/${config.apiCode}/view/All`;
const feed = input
  ? JSON.parse(await readFile(input, "utf8"))
  : await fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return r.json();
    });

const rooms = new Map(feed.rooms.map((r) => [r.id, r.name]));
const speakers = new Map(feed.speakers.map((s) => [s.id, s.fullName]));
const categoryItems = new Map(
  feed.categories.flatMap((c) =>
    c.items.map((i) => [i.id, { category: c.title, name: i.name }]),
  ),
);
const itemsOf = (session, category) =>
  session.categoryItems
    .map((id) => categoryItems.get(id))
    .filter((i) => i && i.category === category)
    .map((i) => i.name);

// "Salt Palace | Level 1 | Grand Ballroom H" -> "Salt Palace · L1 Grand Ballroom H".
// For nested locations ("... | Hall 5 | Cosmic Canyon Zone | Cloud Native
// Theater") keep only the last part.
function roomName(session) {
  const name = (rooms.get(session.roomId) || "").trim();
  const m = name.match(/^(.+?) \| Level (\d+) \| (.+)$/);
  if (!m) return name;
  const venue = config.venues?.[m[1]] ?? m[1];
  const place = m[3].split(" | ").at(-1).trim();
  return `${venue} · L${m[2]} ${place}`;
}
// "2026-11-10T09:05:00" -> "9:05"
const clock = (iso) => iso.slice(11, 16).replace(/^0/, "");
const speakerNames = (session) =>
  session.speakers
    .map((id) => speakers.get(id))
    .filter(Boolean)
    .join(", ");

const days = Object.fromEntries(
  Object.values(config.days).map((k) => [k, { keynotes: [], sessions: [] }]),
);
const desc = {};
const seen = new Set();

for (const s of feed.sessions) {
  const day = config.days[s.startsAt.slice(0, 10)];
  if (!day || s.isServiceSession || config.skip?.[s.id]) continue;
  const primary = itemsOf(s, config.trackCategory);

  if (primary.includes(config.keynoteCategory)) {
    if (config.skipKeynoteTitles.includes(s.title.trim())) continue;
    const sponsored = itemsOf(s, config.sponsoredCategory).length > 0;
    days[day].keynotes.push([
      clock(s.startsAt),
      s.title.trim(),
      speakerNames(s) + (sponsored ? " · sponsored" : ""),
    ]);
    continue;
  }

  const forced = config.include[s.id];
  const trackName = primary.find((p) => config.tracks[p]);
  if (!forced) {
    if (!trackName) continue;
    const sub = itemsOf(s, config.subTopicCategory);
    if (sub.some((t) => config.skipSubTopics.includes(t))) continue;
  }
  const track = forced?.track ?? config.tracks[trackName];
  let fmt = forced?.fmt ?? "";
  if (!forced) {
    if (track === "M") fmt = itemsOf(s, config.projectCategory)[0] ?? "";
    else if (config.formatLabels[trackName])
      fmt = config.formatLabels[trackName];
    else if (itemsOf(s, config.endUserCategory).length) fmt = "End User";
  }
  days[day].sessions.push([
    s.id,
    clock(s.startsAt),
    clock(s.endsAt),
    track,
    s.title.trim(),
    speakerNames(s),
    roomName(s),
    itemsOf(s, config.levelCategory)[0] ?? "",
    fmt,
  ]);
  if (s.description) desc[s.id] = s.description.trim();
  seen.add(s.id);
}

const missing = Object.keys(config.include).filter((id) => !seen.has(id));
if (missing.length) throw new Error(`include ids not found: ${missing}`);
const allIds = new Set(feed.sessions.map((s) => s.id));
const staleSkips = Object.keys(config.skip ?? {}).filter(
  (id) => !allIds.has(id),
);
if (staleSkips.length) console.warn(`skip ids not in feed: ${staleSkips}`);

// Stable order, so unchanged data gives an unchanged file.
const mins = (t) => t.split(":").reduce((h, m) => h * 60 + +m);
for (const d of Object.values(days)) {
  d.keynotes.sort((a, b) => mins(a[0]) - mins(b[0]));
  d.sessions.sort(
    (a, b) =>
      mins(a[1]) - mins(b[1]) ||
      a[6].localeCompare(b[6]) ||
      a[0].localeCompare(b[0]),
  );
}
const out = { source: url, days, desc };
await writeFile(
  resolve(confDir, "schedule.json"),
  JSON.stringify(out, null, 2) + "\n",
);
const counts = Object.entries(days)
  .map(
    ([k, d]) =>
      `${k}: ${d.keynotes.length} keynotes, ${d.sessions.length} sessions`,
  )
  .join("; ");
console.log(`Wrote ${dir}/schedule.json (${counts})`);
