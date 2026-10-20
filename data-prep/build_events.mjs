// ---------------------------------------------------------------------------
// build_events.mjs — merge the seven generated datasets into events.json and
// publish all eight JSON files into src/data/bengaluru/ for the app.
//
// Usage:
//   node data-prep/build_events.mjs          (reads data-prep/final/)
//   node data-prep/build_events.mjs --app    (reads src/data/bengaluru/)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { APP_DATA_DIR, FINAL_DIR } from "./lib/dataset.mjs";

const useAppDir = process.argv.includes("--app");
const SOURCE_DIR = useAppDir ? APP_DATA_DIR : FINAL_DIR;

const FILE_NAMES = [
  "zones.json",
  "gazetteer.json",
  "groundtruth.json",
  "reconstructed_reports.json",
  "sensors.json",
  "official.json",
  "social.json",
];

function readJson(name) {
  const file = path.join(SOURCE_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${file} — run generate_all.mjs first`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sortEvents(events) {
  return [...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id)
  );
}

const datasets = Object.fromEntries(FILE_NAMES.map((name) => [name, readJson(name)]));

const events = sortEvents([
  ...datasets["sensors.json"],
  ...datasets["official.json"],
  ...datasets["social.json"],
  ...datasets["reconstructed_reports.json"],
]);

// Provenance is mandatory on every replay event.
for (const event of events) {
  if (!event.provenance) throw new Error(`event ${event.id} is missing provenance`);
  if (!event.timestamp) throw new Error(`event ${event.id} is missing timestamp`);
}

fs.mkdirSync(FINAL_DIR, { recursive: true });
fs.writeFileSync(
  path.join(FINAL_DIR, "events.json"),
  JSON.stringify(events, null, 2) + "\n",
  "utf8"
);

if (SOURCE_DIR !== FINAL_DIR) {
  // Copy everything (including the just-written events.json) into the app.
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  for (const name of [...FILE_NAMES, "events.json"]) {
    fs.copyFileSync(path.join(FINAL_DIR, name), path.join(APP_DATA_DIR, name));
  }
  console.log(`copied 8 files to ${APP_DATA_DIR}`);
} else {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  for (const name of [...FILE_NAMES, "events.json"]) {
    fs.copyFileSync(path.join(FINAL_DIR, name), path.join(APP_DATA_DIR, name));
  }
  console.log(`copied 8 files to ${APP_DATA_DIR}`);
}

const byChannel = new Map();
for (const event of events) {
  byChannel.set(event.channel, (byChannel.get(event.channel) || 0) + 1);
}
console.log(`events.json: ${events.length} events`);
console.log(
  `channels: ${[...byChannel.entries()]
    .sort()
    .map(([channel, n]) => `${channel}=${n}`)
    .join(" ")}`
);
