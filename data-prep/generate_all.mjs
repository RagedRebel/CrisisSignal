// ---------------------------------------------------------------------------
// generate_all.mjs — deterministic synthesis of the Bengaluru replay datasets.
//
// stdlib-only Node ESM, seeded RNG (seed = 42), fully offline.
// Emits the seven source datasets into data-prep/final/. build_events.mjs then
// merges them into events.json and copies everything into src/data/bengaluru/.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import {
  APP_DATA_DIR,
  BANDS,
  BACKBONE,
  BENCHMARK_CASES,
  BREACH_TEMPLATES,
  BRIDGE_TEMPLATES,
  CHANNEL_BAG,
  createRng,
  districtForZone,
  ELECTRICAL_TEMPLATES,
  FINAL_ACCESS,
  FINAL_DIR,
  FINAL_TEMPLATES,
  FINAL_VULN,
  iso,
  LANDMARKS,
  landmarkById,
  OFFICIAL_BULLETINS,
  OFFICIAL_WORST_HIT,
  RELIEF_TEMPLATES,
  RESCUE_ACCESS,
  RESCUE_TEMPLATES,
  RESCUE_VULN,
  SCENARIO_TITLE,
  SENSOR_STATIONS,
  SERIOUS_ACCESS,
  SERIOUS_TEMPLATES,
  SERIOUS_VULN,
  SHALLOW_ACCESS,
  SHALLOW_TEMPLATES,
  SILENT_ZONES,
  SOCIAL_POSTS,
  TONE_BANDS,
  ZONES,
} from "./lib/dataset.mjs";

const SEED = 42;
const WRITE_DIR = process.argv.includes("--app") ? APP_DATA_DIR : FINAL_DIR;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(name, value) {
  ensureDir(WRITE_DIR);
  fs.writeFileSync(path.join(WRITE_DIR, name), JSON.stringify(value, null, 2) + "\n", "utf8");
  console.log(`wrote ${path.join(WRITE_DIR, name)}`);
}

function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function districtSlug(district) {
  return district.replace(/\s+/g, "");
}

function pickBand(rng, tone) {
  const allowed = TONE_BANDS[tone] || TONE_BANDS.serious;
  const bandKey = rng.pick(allowed);
  return { key: bandKey, ...BANDS[bandKey] };
}

function pickNumber(rng, tone) {
  switch (tone) {
    case "shallow":
      return rng.int(3, 8);
    case "rescue":
      return rng.int(4, 16);
    case "breach":
      return rng.int(8, 30);
    case "bridge":
      return rng.int(6, 22);
    case "electrical":
      return rng.int(2, 9);
    case "relief":
      return rng.int(40, 320);
    default:
      return rng.int(5, 26);
  }
}

function pickAccess(rng, tone) {
  if (tone === "shallow") return rng.pick(SHALLOW_ACCESS);
  if (tone === "rescue") return rng.pick(RESCUE_ACCESS);
  return rng.pick(SERIOUS_ACCESS);
}

function pickVulnerability(rng, tone) {
  if (tone === "rescue") return rng.pick(RESCUE_VULN);
  if (tone === "shallow" || tone === "relief" || tone === "electrical") return "";
  return rng.pick(SERIOUS_VULN);
}

function templatesFor(tone) {
  switch (tone) {
    case "shallow":
      return SHALLOW_TEMPLATES;
    case "breach":
      return BREACH_TEMPLATES;
    case "bridge":
      return BRIDGE_TEMPLATES;
    case "rescue":
      return RESCUE_TEMPLATES;
    case "relief":
      return RELIEF_TEMPLATES;
    case "electrical":
      return ELECTRICAL_TEMPLATES;
    default:
      return SERIOUS_TEMPLATES;
  }
}

function decorateForChannel(core, channel, district) {
  if (channel === "call_transcript") {
    return core;
  }
  if (channel === "sms") {
    return `SMS ALERT: ${core}`;
  }
  if (channel === "volunteer_app") {
    return `VOLUNTEER FIELD REPORT: ${core}`;
  }
  if (channel === "social") {
    if (core.includes("#")) return core;
    return `${core} #BengaluruFloods #${districtSlug(district)}`;
  }
  return core;
}

function buildReportText(rng, tone, landmark, district, channel) {
  const band = pickBand(rng, tone);
  const n = pickNumber(rng, tone);
  const n2 = Math.max(2, Math.round(n / 2));
  const vars = {
    loc: landmark.name,
    district,
    cm: band.cm,
    band: band.label,
    n,
    n2,
    vuln: pickVulnerability(rng, tone),
    access: pickAccess(rng, tone),
  };

  let core = fillTemplate(rng.pick(templatesFor(tone)), vars);
  core = core.replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();

  return decorateForChannel(core, channel, district);
}

/**
 * Rewrites the chronologically last report of a hotspot with a curated closing
 * update. Because the merger lets the latest observation win for water band,
 * trend and access status, this pins the end-of-replay severity signals of each
 * hotspot while all other reports keep their generated noise.
 */
function buildFinalText(tone, landmark, district, channel, final) {
  const band = final.band ? { key: final.band, ...BANDS[final.band] } : null;
  const vars = {
    loc: landmark.name,
    district,
    cm: band ? band.cm : "",
    band: band ? band.label : "",
    n: final.people,
    n2: Math.max(2, Math.round((final.people ?? 4) / 2)),
    vuln: FINAL_VULN[final.vuln || "none"] || "",
    access: FINAL_ACCESS[final.access || "ok"] || "",
  };
  const template = FINAL_TEMPLATES[final.template || tone] || FINAL_TEMPLATES.serious;
  const core = fillTemplate(template, vars).replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();
  return decorateForChannel(core, channel, district);
}

function metadataFor(rng, channel) {
  if (channel === "call_transcript") {
    return { call_duration_sec: rng.int(42, 190), social_likes: null, is_second_hand: false };
  }
  if (channel === "social") {
    const secondHand = rng.chance(0.35);
    return { call_duration_sec: null, social_likes: rng.int(12, 980), is_second_hand: secondHand };
  }
  return { call_duration_sec: null, social_likes: null, is_second_hand: false };
}

function sourceTypeFor(channel, metadata) {
  if (channel === "volunteer_app") return "volunteer";
  if (channel === "social") return metadata.is_second_hand ? "second_hand" : "first_hand";
  return "first_hand";
}

function buildReconstructedReports() {
  const rng = createRng(SEED);
  const channelBag = rng.shuffle(CHANNEL_BAG);
  let channelIndex = 0;
  const nextChannel = () => {
    if (channelIndex >= channelBag.length) throw new Error("channel bag exhausted");
    return channelBag[channelIndex++];
  };

  const pending = [];
  let sequence = 0;
  const lastByHotspot = new Map();

  for (const backbone of BACKBONE) {
    for (const hotspot of backbone.hotspot_weights) {
      for (let i = 0; i < hotspot.count; i++) {
        const landmark = landmarkById(hotspot.landmark);
        const district = districtForZone(landmark.zone_id);
        const channel = nextChannel();
        const offset =
          hotspot.tone === "relief"
            ? rng.int(10, 180)
            : hotspot.tone === "shallow"
            ? rng.int(4, 80)
            : rng.int(5, 130);
        const metadata = metadataFor(rng, channel);
        const report = {
          sequence: sequence++,
          channel,
          sender_id: channel === "volunteer_app" ? `vol-${rng.int(100, 499)}` : `usr-${rng.int(1000, 9999)}`,
          timestamp: iso(Date.parse(backbone.event_at) + offset * 60000),
          raw_text: buildReportText(rng, hotspot.tone, landmark, district, channel),
          source_type: sourceTypeFor(channel, metadata),
          provenance: "reconstructed",
          metadata,
          _gt_backbone_id: backbone.id,
          _gt_district: district,
          _gt_is_duplicate_of: null,
          _gt_is_rumour: false,
        };
        pending.push(report);
        const current = lastByHotspot.get(hotspot);
        if (!current || Date.parse(report.timestamp) >= Date.parse(current.timestamp)) {
          lastByHotspot.set(hotspot, report);
        }
      }
    }

    // Copy-paste rumour cluster for case (f): identical text, one originator.
    if (backbone.rumour_count) {
      const landmark = landmarkById(backbone.rumour_landmark);
      const district = districtForZone(landmark.zone_id);
      const text =
        "URGENT!! KRS dam gates opened without any siren, a 10 feet water wall is reaching MG Road Metro Station in 20 minutes. Forward this to everyone!! #BengaluruFloods #SOS";
      for (let i = 0; i < backbone.rumour_count; i++) {
        const channel = nextChannel();
        const metadata = { call_duration_sec: null, social_likes: 200 + i * 37, is_second_hand: i > 0 };
        pending.push({
          sequence: sequence++,
          channel,
          sender_id:
            channel === "volunteer_app" ? `vol-${420 + i}` : `usr-${4200 + i}`,
          timestamp: iso(Date.parse(backbone.event_at) + (38 + i) * 60000),
          raw_text: text,
          source_type: "second_hand",
          provenance: "reconstructed",
          metadata,
          _gt_backbone_id: backbone.id,
          _gt_district: district,
          _gt_is_duplicate_of: null,
          _gt_is_rumour: true,
        });
      }
    }
  }

  // Curated closing updates: rewrite each hotspot's chronologically last report
  // so the end-of-replay incident signals match the hidden ground truth.
  for (const [hotspot, report] of lastByHotspot) {
    if (!hotspot.final) continue;
    const landmark = landmarkById(hotspot.landmark);
    const district = districtForZone(landmark.zone_id);
    report.raw_text = buildFinalText(hotspot.tone, landmark, district, report.channel, hotspot.final);
  }

  pending.sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.sequence - b.sequence
  );

  const idBySequence = new Map();
  pending.forEach((report, index) => {
    report.id = `rep-${String(index + 1).padStart(4, "0")}`;
    idBySequence.set(report.sequence, report.id);
  });

  // Wire the rumour cluster links after ids are final.
  const rumourIds = pending.filter((report) => report._gt_is_rumour).map((report) => report.id);
  const originator = rumourIds[0];
  for (const report of pending) {
    if (report._gt_is_rumour && report.id !== originator) {
      report._gt_is_duplicate_of = originator;
    }
  }

  // Guarantee one second-hand trapped social report for the reliability demo.
  const reliabilityCandidate = pending.find(
    (report) =>
      report.channel === "social" &&
      report._gt_backbone_id === "bb-003" &&
      !report._gt_is_rumour
  );
  if (reliabilityCandidate) {
    reliabilityCandidate.source_type = "second_hand";
    reliabilityCandidate.metadata.is_second_hand = true;
  }

  return pending;
}

function buildSensors() {
  const rng = createRng(SEED + 7);
  const readings = [];
  const startMs = Date.parse("2022-08-22T00:00:00Z");
  const stepMs = 4 * 60 * 60 * 1000;
  const count = 90;

  for (const station of SENSOR_STATIONS) {
    const sigmaMs = station.sigma_days * 24 * 60 * 60 * 1000;
    const peakMs = Date.parse(station.peak_at);
    for (let i = 0; i < count; i++) {
      const t = startMs + i * stepMs;
      const curve = Math.exp(-Math.pow((t - peakMs) / sigmaMs, 2));
      const noise = rng.int(-6, 6);
      const level = Math.round(station.base_cm + station.amplitude_cm * curve) + noise;
      const nextT = t + stepMs;
      const nextCurve = Math.exp(-Math.pow((nextT - peakMs) / sigmaMs, 2));
      const nextLevel = station.base_cm + station.amplitude_cm * nextCurve;
      const trend = nextLevel - level > 2 ? "rising" : nextLevel - level < -2 ? "falling" : "stable";
      const status =
        level >= station.danger_cm
          ? "danger"
          : level >= station.warning_cm - 18
          ? "warning"
          : "normal";
      const statusText =
        status === "danger"
          ? "EXCEEDS DANGER MARK"
          : status === "warning"
          ? "APPROACHING WARNING"
          : "BELOW WARNING LEVEL";
      readings.push({
        id: `sens-${String(readings.length + 1).padStart(4, "0")}`,
        channel: "sensor",
        provenance: "reconstructed",
        timestamp: iso(t),
        sender_id: `ksndmc-${station.id}`,
        raw_text: `KSNDMC TELEMETRY: ${station.waterbody} at ${station.station} is at ${(level / 100).toFixed(2)}m (${statusText}). Trend: ${trend}.`,
        source_type: "sensor",
        district: station.district,
        metadata: {
          station: station.station,
          waterbody: station.waterbody,
          level_cm: level,
          danger_level_cm: station.danger_cm,
          warning_level_cm: station.warning_cm,
          status,
          trend,
          source: "synthetic_gauge_curve",
        },
        location_hint: {
          lat: station.lat,
          lng: station.lng,
          name: `${station.station} gauge, ${station.district}`,
        },
      });
    }
  }

  return readings;
}

function buildOfficial() {
  return OFFICIAL_BULLETINS.map((bulletin) => ({
    id: bulletin.id,
    channel: "official",
    provenance: "reconstructed",
    timestamp: bulletin.timestamp,
    sender_id: bulletin.source_org.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    raw_text: bulletin.raw_text,
    source_type: "official",
    district: bulletin.district,
    metadata: {
      source_org: bulletin.source_org,
      affected_zones: bulletin.facts.affected_zones,
      population_affected: bulletin.facts.population_affected,
      relief_camps: bulletin.facts.relief_camps,
      deaths: bulletin.facts.deaths,
    },
    location_hint: bulletin.location,
    _gt_district: bulletin.district,
  }));
}

function buildSocial() {
  return SOCIAL_POSTS.map((post) => ({
    id: post.id,
    channel: "social",
    provenance: "reconstructed",
    timestamp: post.timestamp,
    sender_id: post.sender_id,
    raw_text: post.raw_text,
    source_type: "first_hand",
    district: post.district,
    metadata: {
      call_duration_sec: null,
      social_likes: post.likes,
      is_second_hand: false,
    },
    location_hint: post.location_hint,
    _gt_district: post.district,
  }));
}

function buildGroundTruth() {
  return {
    scenario_title: SCENARIO_TITLE,
    backbone_true_events: BACKBONE.map((event) => ({
      id: event.id,
      event_at: event.event_at,
      event_at_precision: event.event_at_precision,
      location: {
        district: event.district,
        sub_location: event.sub_location,
        lat: event.lat,
        lng: event.lng,
      },
      event_type: event.event_type,
      people_affected: event.people_affected,
      deaths: event.deaths,
      villages_affected: event.villages_affected,
      access_status: event.access_status,
      outlet: event.outlet,
      url: event.url,
      evidence_phrase: event.evidence_phrase,
    })),
    benchmark_cases: BENCHMARK_CASES,
    official_worst_hit_districts: OFFICIAL_WORST_HIT,
    silent_zones: SILENT_ZONES,
  };
}

function buildGazetteer() {
  return LANDMARKS.map((landmark) => ({
    id: landmark.id,
    name: landmark.name,
    aliases: landmark.aliases,
    type: landmark.type,
    zone_id: landmark.zone_id,
    district: districtForZone(landmark.zone_id),
    location: landmark.location,
  }));
}

// --- main -------------------------------------------------------------------

const reports = buildReconstructedReports();

writeJson("zones.json", ZONES);
writeJson("gazetteer.json", buildGazetteer());
writeJson("groundtruth.json", buildGroundTruth());
writeJson("reconstructed_reports.json", reports);
writeJson("sensors.json", buildSensors());
writeJson("official.json", buildOfficial());
writeJson("social.json", buildSocial());

const byBackbone = new Map();
for (const report of reports) {
  byBackbone.set(report._gt_backbone_id, (byBackbone.get(report._gt_backbone_id) || 0) + 1);
}
console.log(`reconstructed reports: ${reports.length}`);
console.log(
  `per backbone: ${[...byBackbone.entries()].map(([id, n]) => `${id}=${n}`).join(" ")}`
);
console.log("generate_all.mjs complete (seed 42, synthetic data only).");
