// ---------------------------------------------------------------------------
// validate.mjs — structural checks over the generated Bengaluru replay data.
//
// Fails loudly (non-zero exit) if any invariant from the rebuild plan breaks.
//   node data-prep/validate.mjs            (validates src/data/bengaluru/)
//   node data-prep/validate.mjs --final    (validates data-prep/final/)
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import {
  APP_DATA_DIR,
  FINAL_DIR,
  SCENARIO_END,
  SCENARIO_START,
} from "./lib/dataset.mjs";

const DIR = process.argv.includes("--final") ? FINAL_DIR : APP_DATA_DIR;

const EXPECTED = {
  events: 767,
  zones: 12,
  gazetteer: 60,
  reconstructed: 300,
  sensors: 450,
  official: 9,
  social: 8,
  backbone: 10,
};

const CHANNEL_COUNTS = {
  sensor: 450,
  official: 9,
  social: 102,
  call_transcript: 84,
  sms: 64,
  volunteer_app: 58,
};

const REPORT_CHANNEL_COUNTS = {
  call_transcript: 84,
  sms: 64,
  social: 94,
  volunteer_app: 58,
};

const FORBIDDEN = [
  "assam",
  "nadipur",
  "asdma",
  "brahmaputra",
  "dikhow",
  "disang",
  "sivasagar",
  "charaideo",
  "mahmora",
  "kathpuri",
  "nazira",
  "majuli",
  "http://",
  "https://",
];

const errors = [];
const warnings = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function readJson(name) {
  const file = path.join(DIR, name);
  check(fs.existsSync(file), `missing ${file}`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const zones = readJson("zones.json");
const gazetteer = readJson("gazetteer.json");
const groundtruth = readJson("groundtruth.json");
const reports = readJson("reconstructed_reports.json");
const sensors = readJson("sensors.json");
const official = readJson("official.json");
const social = readJson("social.json");
const events = readJson("events.json");

if (!zones || !gazetteer || !groundtruth || !reports || !sensors || !official || !social || !events) {
  console.error(`Cannot validate: one or more files missing under ${DIR}`);
  process.exit(1);
}

// --- counts -----------------------------------------------------------------

check(events.length === EXPECTED.events, `events: ${events.length} (expected ${EXPECTED.events})`);
check(zones.length === EXPECTED.zones, `zones: ${zones.length} (expected ${EXPECTED.zones})`);
check(
  gazetteer.length === EXPECTED.gazetteer,
  `gazetteer: ${gazetteer.length} (expected ${EXPECTED.gazetteer})`
);
check(
  reports.length === EXPECTED.reconstructed,
  `reconstructed: ${reports.length} (expected ${EXPECTED.reconstructed})`
);
check(sensors.length === EXPECTED.sensors, `sensors: ${sensors.length} (expected ${EXPECTED.sensors})`);
check(official.length === EXPECTED.official, `official: ${official.length} (expected ${EXPECTED.official})`);
check(social.length === EXPECTED.social, `social: ${social.length} (expected ${EXPECTED.social})`);
check(
  groundtruth.backbone_true_events.length === EXPECTED.backbone,
  `backbone: ${groundtruth.backbone_true_events.length} (expected ${EXPECTED.backbone})`
);

// --- channels ---------------------------------------------------------------

const channelTally = {};
for (const event of events) {
  channelTally[event.channel] = (channelTally[event.channel] || 0) + 1;
}
for (const [channel, expected] of Object.entries(CHANNEL_COUNTS)) {
  check(
    channelTally[channel] === expected,
    `channel ${channel}: ${channelTally[channel] ?? 0} (expected ${expected})`
  );
}
const reportTally = {};
for (const report of reports) {
  reportTally[report.channel] = (reportTally[report.channel] || 0) + 1;
}
for (const [channel, expected] of Object.entries(REPORT_CHANNEL_COUNTS)) {
  check(
    reportTally[channel] === expected,
    `reconstructed channel ${channel}: ${reportTally[channel] ?? 0} (expected ${expected})`
  );
}

// --- ids and ordering -------------------------------------------------------

const eventIds = new Set();
let previous = -Infinity;
for (const event of events) {
  check(Boolean(event.id), "event without id");
  check(!eventIds.has(event.id), `duplicate event id ${event.id}`);
  eventIds.add(event.id);
  const t = Date.parse(event.timestamp);
  check(!Number.isNaN(t), `event ${event.id} has invalid timestamp`);
  check(t >= previous, `events are not sorted at ${event.id}`);
  previous = t;
  check(Boolean(event.provenance), `event ${event.id} missing provenance`);
  check(event.provenance === "reconstructed", `event ${event.id} provenance is not reconstructed`);
}

const zoneIds = new Set(zones.map((zone) => zone.id));
const landmarkIds = new Set(gazetteer.map((entry) => entry.id));
const backboneIds = new Set(groundtruth.backbone_true_events.map((event) => event.id));

check(landmarkIds.size === gazetteer.length, "duplicate landmark ids");
check(new Set(zones.map((zone) => zone.id)).size === zones.length, "duplicate zone ids");

for (const zone of zones) {
  check(Boolean(zone.district), `zone ${zone.id} has no district`);
  check(Boolean(zone.center), `zone ${zone.id} has no center`);
  check(Array.isArray(zone.polygon) && zone.polygon.length >= 3, `zone ${zone.id} polygon too small`);
  check(
    typeof zone.base_connectivity === "number" &&
      zone.base_connectivity >= 0 &&
      zone.base_connectivity <= 1,
    `zone ${zone.id} bad base_connectivity`
  );
  for (const override of zone.connectivity_overrides || []) {
    check(Boolean(override.after), `zone ${zone.id} override missing after`);
    check(typeof override.new_value === "number", `zone ${zone.id} override missing new_value`);
    check(Boolean(override.reason), `zone ${zone.id} override missing reason`);
  }
}

for (const entry of gazetteer) {
  check(zoneIds.has(entry.zone_id), `landmark ${entry.id} references unknown zone ${entry.zone_id}`);
  check(Boolean(entry.location), `landmark ${entry.id} missing location`);
  check(entry.aliases.length >= 1, `landmark ${entry.id} has no aliases`);
}

// --- report/backbone wiring -------------------------------------------------

const perBackbone = new Map();
for (const report of reports) {
  check(backboneIds.has(report._gt_backbone_id), `report ${report.id} links unknown backbone`);
  perBackbone.set(report._gt_backbone_id, (perBackbone.get(report._gt_backbone_id) || 0) + 1);
  check(report.provenance === "reconstructed", `report ${report.id} provenance wrong`);
  check(Boolean(report.raw_text), `report ${report.id} has no text`);
  check(Boolean(report._gt_district), `report ${report.id} has no district hint`);
}
for (const id of backboneIds) {
  check((perBackbone.get(id) || 0) > 0, `backbone ${id} has no reports`);
}

const duplicates = reports.filter((report) => report._gt_is_duplicate_of);
check(duplicates.length >= 5, "expected the case (f) copy-paste cluster");
const rumourTargets = new Set(duplicates.map((report) => report._gt_is_duplicate_of));
for (const target of rumourTargets) {
  check(reports.some((report) => report.id === target), `rumour target ${target} not found`);
}
check(
  reports.some(
    (report) =>
      report.channel === "social" &&
      report.source_type === "second_hand" &&
      /trapped|stranded/i.test(report.raw_text)
  ),
  "need at least one second-hand trapped social report for the reliability story"
);

// --- geography and time -----------------------------------------------------

function inWindow(iso) {
  const t = Date.parse(iso);
  return t >= Date.parse(SCENARIO_START) && t <= Date.parse(SCENARIO_END);
}
function inBbox(lat, lng) {
  return lat >= 12.5 && lat <= 13.4 && lng >= 77.1 && lng <= 78.1;
}

for (const event of events) {
  check(inWindow(event.timestamp), `event ${event.id} outside scenario window (${event.timestamp})`);
  const hint = event.location_hint;
  if (hint && typeof hint.lat === "number") {
    check(inBbox(hint.lat, hint.lng), `event ${event.id} location outside Bengaluru bbox`);
  }
}
for (const zone of zones) {
  check(inBbox(zone.center.lat, zone.center.lng), `zone ${zone.id} center outside bbox`);
  for (const point of zone.polygon) {
    check(inBbox(point.lat, point.lng), `zone ${zone.id} polygon point outside bbox`);
  }
}
for (const entry of gazetteer) {
  check(
    inBbox(entry.location.lat, entry.location.lng),
    `landmark ${entry.id} outside Bengaluru bbox`
  );
}

// Sensor coverage: each station must have 90 readings and cross its warning mark.
const byStation = new Map();
for (const reading of sensors) {
  const station = reading.metadata.station;
  if (!byStation.has(station)) byStation.set(station, []);
  byStation.get(station).push(reading);
}
check(byStation.size === 5, `sensor stations: ${byStation.size} (expected 5)`);
for (const [station, readings] of byStation) {
  check(readings.length === 90, `sensor ${station}: ${readings.length} readings (expected 90)`);
  check(
    readings.some((reading) => reading.metadata.level_cm >= reading.metadata.warning_level_cm),
    `sensor ${station} never crosses its warning mark`
  );
  check(
    readings.some((reading) => reading.metadata.status === "danger"),
    `sensor ${station} never reaches danger status`
  );
  const trends = new Set(readings.map((reading) => reading.metadata.trend));
  check(trends.has("rising") && trends.has("falling"), `sensor ${station} trend never reverses`);
}

// --- ground truth -----------------------------------------------------------

check(groundtruth.benchmark_cases, "groundtruth missing benchmark_cases");
for (const [caseId, info] of Object.entries(groundtruth.benchmark_cases || {})) {
  check(backboneIds.has(info.backbone_id), `${caseId} references unknown backbone ${info.backbone_id}`);
  check(zoneIds.has(info.zone_id), `${caseId} references unknown zone ${info.zone_id}`);
}
check(
  Array.isArray(groundtruth.official_worst_hit_districts) &&
    groundtruth.official_worst_hit_districts.length >= 5,
  "official_worst_hit_districts missing or too small"
);
check(Array.isArray(groundtruth.silent_zones) && groundtruth.silent_zones.length >= 2, "silent_zones missing");
for (const zone of groundtruth.silent_zones || []) {
  check(zoneIds.has(zone.zone_id), `silent zone ${zone.zone_id} unknown`);
  check(Boolean(zone.failure_mode), `silent zone ${zone.zone_id} missing failure_mode`);
  check(Boolean(zone.onset_time), `silent zone ${zone.zone_id} missing onset_time`);
}

// --- forbidden legacy strings ----------------------------------------------

function scanStrings(value, pathLabel) {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    for (const needle of FORBIDDEN) {
      if (needle.startsWith("http")) continue; // checked separately below
      if (lower.includes(needle)) {
        errors.push(`forbidden term "${needle}" found in ${pathLabel}`);
        return;
      }
    }
    if (/https?:\/\//i.test(value)) {
      errors.push(`URL found in ${pathLabel}`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => scanStrings(item, `${pathLabel}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      scanStrings(item, `${pathLabel}.${key}`);
    }
  }
}

for (const [name, data] of [
  ["zones.json", zones],
  ["gazetteer.json", gazetteer],
  ["groundtruth.json", groundtruth],
  ["reconstructed_reports.json", reports],
  ["sensors.json", sensors],
  ["official.json", official],
  ["social.json", social],
  ["events.json", events],
]) {
  scanStrings(data, name);
}

// --- report -----------------------------------------------------------------

for (const message of warnings) console.warn(`WARN ${message}`);
if (errors.length > 0) {
  for (const message of errors) console.error(`FAIL ${message}`);
  console.error(`\nvalidate.mjs: ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`validate.mjs: all checks passed (${events.length} events, ${reports.length} reports)`);
