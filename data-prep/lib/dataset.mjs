// ---------------------------------------------------------------------------
// Simulated Bengaluru flood replay (22 Aug – 7 Sep 2022 IST) — shared dataset
//
// 100% synthetic. Real geography and real 2022 flood dates, invented incidents,
// invented citizen messages, fictional social handles and generic official
// roles. Deterministic: seeded RNG, no network access, no scraped content.
// ---------------------------------------------------------------------------

import path from "node:path";
import { fileURLToPath } from "node:url";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
export const FINAL_DIR = path.resolve(__dirname, "..", "final");
export const APP_DATA_DIR = path.resolve(ROOT, "src", "data", "bengaluru");

// Replay window: 2022-08-22 00:00 IST through 2022-09-08 00:00 IST.
export const SCENARIO_START = "2022-08-21T18:30:00Z";
export const SCENARIO_END = "2022-09-07T18:30:00Z";
export const SCENARIO_TITLE = "Bengaluru Flood Replay (22 August – 7 September 2022)";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    shuffle(list) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

/** ISO string without milliseconds, matching the replay data style. */
export function iso(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function minutesAfter(isoString, mins) {
  return iso(Date.parse(isoString) + Math.round(mins) * 60000);
}

export function dayKey(isoString) {
  return isoString.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Zones — 12 BBMP-style planning zones in the Bengaluru core.
// "district" values are multi-word impact-assessment labels so they cannot
// trigger accidental matches inside ordinary English words.
// ---------------------------------------------------------------------------

export const ZONES = [
  {
    id: "zone-central",
    name: "Central Bengaluru (MG Road–Shivajinagar)",
    district: "Central Bengaluru",
    code: "BLR-CEN",
    population: 480000,
    area_sq_km: 32.0,
    center: { lat: 12.975, lng: 77.6 },
    polygon: [
      { lat: 12.995, lng: 77.575 },
      { lat: 13.0, lng: 77.625 },
      { lat: 12.955, lng: 77.63 },
      { lat: 12.95, lng: 77.58 },
    ],
    vulnerability_index: 0.55,
    base_connectivity: 0.92,
    connectivity_overrides: [],
    population_density: 15000,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Wetland and drain network close to the CBD; service roads pond quickly but connectivity is high.",
  },
  {
    id: "zone-indiranagar",
    name: "Indiranagar–Domlur",
    district: "East Bengaluru",
    code: "BLR-EAS",
    population: 520000,
    area_sq_km: 36.0,
    center: { lat: 12.97, lng: 77.64 },
    polygon: [
      { lat: 12.995, lng: 77.62 },
      { lat: 13.0, lng: 77.665 },
      { lat: 12.945, lng: 77.67 },
      { lat: 12.94, lng: 77.625 },
    ],
    vulnerability_index: 0.26,
    base_connectivity: 0.9,
    connectivity_overrides: [],
    population_density: 14400,
    has_hospital: true,
    has_relief_camp: false,
    notes: "Old stormwater drains along the airport road corridor; underpasses back up during cloudbursts. Well-connected, low social vulnerability.",
  },
  {
    id: "zone-koramangala",
    name: "Koramangala–Ejipura",
    district: "South East Bengaluru",
    code: "BLR-KOR",
    population: 610000,
    area_sq_km: 40.0,
    center: { lat: 12.934, lng: 77.624 },
    polygon: [
      { lat: 12.955, lng: 77.6 },
      { lat: 12.96, lng: 77.645 },
      { lat: 12.915, lng: 77.65 },
      { lat: 12.91, lng: 77.605 },
    ],
    vulnerability_index: 0.68,
    base_connectivity: 0.85,
    connectivity_overrides: [],
    population_density: 15250,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Dense mixed-use valley; the Ejipura junction underpass is a known ponding choke point.",
  },
  {
    id: "zone-silkboard",
    name: "Silk Board–HSR–BTM",
    district: "Bommanahalli",
    code: "BLR-SLK",
    population: 780000,
    area_sq_km: 52.0,
    center: { lat: 12.912, lng: 77.622 },
    polygon: [
      { lat: 12.935, lng: 77.6 },
      { lat: 12.94, lng: 77.65 },
      { lat: 12.89, lng: 77.655 },
      { lat: 12.885, lng: 77.605 },
    ],
    vulnerability_index: 0.76,
    base_connectivity: 0.8,
    connectivity_overrides: [],
    population_density: 15000,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Junction flooding around Silk Board and Madiwala lake outflow; heavy commuter exposure.",
  },
  {
    id: "zone-jayanagar",
    name: "Jayanagar–JP Nagar",
    district: "South Bengaluru",
    code: "BLR-JAY",
    population: 690000,
    area_sq_km: 44.0,
    center: { lat: 12.925, lng: 77.583 },
    polygon: [
      { lat: 12.945, lng: 77.555 },
      { lat: 12.95, lng: 77.6 },
      { lat: 12.905, lng: 77.605 },
      { lat: 12.9, lng: 77.56 },
    ],
    vulnerability_index: 0.24,
    base_connectivity: 0.86,
    connectivity_overrides: [],
    population_density: 15700,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Planned layouts with aging stormwater lines; localised knee-deep ponding on arterial roads. Low social vulnerability and strong reporting culture.",
  },
  {
    id: "zone-west",
    name: "RR Nagar–Vrishabhavathi Valley",
    district: "West Bengaluru",
    code: "BLR-WES",
    population: 850000,
    area_sq_km: 58.0,
    center: { lat: 12.94, lng: 77.52 },
    polygon: [
      { lat: 12.97, lng: 77.48 },
      { lat: 12.975, lng: 77.545 },
      { lat: 12.91, lng: 77.55 },
      { lat: 12.905, lng: 77.485 },
    ],
    vulnerability_index: 0.82,
    base_connectivity: 0.72,
    connectivity_overrides: [],
    population_density: 14650,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Vrishabhavathi river corridor receives sewage-mixed stormwater; riverbank colonies flood first.",
  },
  {
    id: "zone-hebbal",
    name: "Hebbal–Kempapura",
    district: "North Bengaluru",
    code: "BLR-HEB",
    population: 540000,
    area_sq_km: 38.0,
    center: { lat: 13.035, lng: 77.59 },
    polygon: [
      { lat: 13.065, lng: 77.56 },
      { lat: 13.07, lng: 77.62 },
      { lat: 13.01, lng: 77.625 },
      { lat: 13.005, lng: 77.565 },
    ],
    vulnerability_index: 0.72,
    base_connectivity: 0.82,
    connectivity_overrides: [],
    population_density: 14200,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Hebbal lake and valley drains pass under the flyover; Kempapura has a distribution substation in the floodplain.",
  },
  {
    id: "zone-yelahanka",
    name: "Yelahanka–Kogilu",
    district: "Yelahanka",
    code: "BLR-YEL",
    population: 390000,
    area_sq_km: 42.0,
    center: { lat: 13.095, lng: 77.59 },
    polygon: [
      { lat: 13.125, lng: 77.555 },
      { lat: 13.13, lng: 77.62 },
      { lat: 13.07, lng: 77.625 },
      { lat: 13.065, lng: 77.56 },
    ],
    vulnerability_index: 0.88,
    base_connectivity: 0.3,
    connectivity_overrides: [],
    population_density: 9300,
    has_hospital: true,
    has_relief_camp: false,
    notes: "Kogilu low-income layouts and informal storm drains; chronic coverage deficit and thin volunteer network.",
  },
  {
    id: "zone-orr",
    name: "ORR IT Corridor (Bellandur–Kadubeesanahalli)",
    district: "Mahadevapura",
    code: "BLR-ORR",
    population: 720000,
    area_sq_km: 46.0,
    center: { lat: 12.933, lng: 77.69 },
    polygon: [
      { lat: 12.965, lng: 77.675 },
      { lat: 12.968, lng: 77.73 },
      { lat: 12.91, lng: 77.735 },
      { lat: 12.905, lng: 77.68 },
    ],
    vulnerability_index: 0.74,
    base_connectivity: 0.88,
    connectivity_overrides: [],
    population_density: 15650,
    has_hospital: true,
    has_relief_camp: true,
    notes: "IT corridor with high report volume; service roads and tech-park basements flood quickly.",
  },
  {
    id: "zone-bellandur",
    name: "Bellandur–Yemalur",
    district: "Mahadevapura",
    code: "BLR-BEL",
    population: 430000,
    area_sq_km: 34.0,
    center: { lat: 12.928, lng: 77.655 },
    polygon: [
      { lat: 12.955, lng: 77.625 },
      { lat: 12.958, lng: 77.67 },
      { lat: 12.9, lng: 77.675 },
      { lat: 12.895, lng: 77.63 },
    ],
    vulnerability_index: 0.8,
    base_connectivity: 0.84,
    connectivity_overrides: [],
    population_density: 12650,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Downstream of Bellandur and Varthur lakes; gate operations and weir overflow drive rapid inundation.",
  },
  {
    id: "zone-whitefield",
    name: "Whitefield–Varthur",
    district: "Mahadevapura",
    code: "BLR-WHF",
    population: 660000,
    area_sq_km: 54.0,
    center: { lat: 12.98, lng: 77.74 },
    polygon: [
      { lat: 13.01, lng: 77.705 },
      { lat: 13.015, lng: 77.775 },
      { lat: 12.95, lng: 77.78 },
      { lat: 12.945, lng: 77.71 },
    ],
    vulnerability_index: 0.7,
    base_connectivity: 0.84,
    connectivity_overrides: [],
    population_density: 12200,
    has_hospital: true,
    has_relief_camp: true,
    notes: "Rapidly built-up plateau; Varthur lake spills towards the ITPL approach roads and camp grounds.",
  },
  {
    id: "zone-north",
    name: "Thanisandra–Jakkur",
    district: "Yelahanka",
    code: "BLR-NOR",
    population: 430000,
    area_sq_km: 40.0,
    center: { lat: 13.07, lng: 77.64 },
    polygon: [
      { lat: 13.1, lng: 77.61 },
      { lat: 13.105, lng: 77.675 },
      { lat: 13.045, lng: 77.68 },
      { lat: 13.04, lng: 77.615 },
    ],
    vulnerability_index: 0.82,
    base_connectivity: 0.55,
    connectivity_overrides: [
      {
        after: "2022-09-04T05:00:00Z",
        new_value: 0.08,
        reason:
          "Jakkur culvert collapse severed the fibre backbone and the tower's diesel generator ran dry",
      },
    ],
    population_density: 10750,
    has_hospital: false,
    has_relief_camp: true,
    notes: "Wetland belt between Jakkur and Thanisandra; one culvert carries the only all-weather road link.",
  },
];

// ---------------------------------------------------------------------------
// Landmarks — five per zone, real Bengaluru place names, synthetic aliases.
// ---------------------------------------------------------------------------

export const LANDMARKS = [
  // Central Bengaluru
  { id: "lm-cen-cubbon", name: "Cubbon Park East Gate", aliases: ["Cubbon Park Gate", "Cubbon Park"], type: "admin", zone_id: "zone-central", location: { lat: 12.976, lng: 77.6 } },
  { id: "lm-cen-mgroad", name: "MG Road Metro Station", aliases: ["MG Road Metro", "MG Road"], type: "transit", zone_id: "zone-central", location: { lat: 12.9756, lng: 77.6064 } },
  { id: "lm-cen-krcircle", name: "K R Circle Bus Stand", aliases: ["KR Circle", "K.R. Circle"], type: "transit", zone_id: "zone-central", location: { lat: 12.976, lng: 77.593 } },
  { id: "lm-cen-shivajinagar", name: "Shivajinagar Market", aliases: ["Shivajinagar"], type: "market", zone_id: "zone-central", location: { lat: 12.985, lng: 77.605 } },
  { id: "lm-cen-bowring", name: "Bowring Hospital", aliases: ["Bowring and Lady Curzon Hospital", "Bowring"], type: "hospital", zone_id: "zone-central", location: { lat: 12.982, lng: 77.601 } },
  // East Bengaluru
  { id: "lm-ind-domlur", name: "Domlur Flyover", aliases: ["Domlur Bridge"], type: "highway", zone_id: "zone-indiranagar", location: { lat: 12.961, lng: 77.638 } },
  { id: "lm-ind-cmh", name: "CMH Road Junction", aliases: ["CMH Road"], type: "market", zone_id: "zone-indiranagar", location: { lat: 12.978, lng: 77.638 } },
  { id: "lm-ind-100ft", name: "100 Feet Road Indiranagar", aliases: ["100 Feet Road", "Indiranagar 100 Feet Road"], type: "highway", zone_id: "zone-indiranagar", location: { lat: 12.971, lng: 77.641 } },
  { id: "lm-ind-esi", name: "ESI Hospital Indiranagar", aliases: ["ESI Hospital"], type: "hospital", zone_id: "zone-indiranagar", location: { lat: 12.977, lng: 77.647 } },
  { id: "lm-ind-hal", name: "HAL Airport Road Underpass", aliases: ["HAL Underpass"], type: "infrastructure", zone_id: "zone-indiranagar", location: { lat: 12.96, lng: 77.653 } },
  // South East Bengaluru (Koramangala)
  { id: "lm-kor-ejipura", name: "Ejipura Junction Underpass", aliases: ["Ejipura Junction", "Ejipura Underpass", "Ejipura"], type: "infrastructure", zone_id: "zone-koramangala", location: { lat: 12.934, lng: 77.623 } },
  { id: "lm-kor-jnc", name: "Koramangala JNC", aliases: ["Koramangala Junction", "Koramangala Jn"], type: "transit", zone_id: "zone-koramangala", location: { lat: 12.9348, lng: 77.6245 } },
  { id: "lm-kor-sony", name: "Sony World Signal", aliases: ["Sony World Junction"], type: "transit", zone_id: "zone-koramangala", location: { lat: 12.9355, lng: 77.6265 } },
  { id: "lm-kor-forum", name: "Forum Mall Koramangala", aliases: ["Forum Mall"], type: "commercial", zone_id: "zone-koramangala", location: { lat: 12.934, lng: 77.612 } },
  { id: "lm-kor-stjohns", name: "St John's Hospital Koramangala", aliases: ["St John's Hospital"], type: "hospital", zone_id: "zone-koramangala", location: { lat: 12.93, lng: 77.618 } },
  // Bommanahalli (Silk Board)
  { id: "lm-slk-silk", name: "Silk Board Junction", aliases: ["Silk Board", "Central Silk Board"], type: "transit", zone_id: "zone-silkboard", location: { lat: 12.9175, lng: 77.622 } },
  { id: "lm-slk-hsr", name: "HSR Layout Sector 2", aliases: ["HSR Layout"], type: "residential", zone_id: "zone-silkboard", location: { lat: 12.912, lng: 77.641 } },
  { id: "lm-slk-btm", name: "BTM Layout 2nd Stage", aliases: ["BTM Layout", "BTM 2nd Stage"], type: "residential", zone_id: "zone-silkboard", location: { lat: 12.916, lng: 77.61 } },
  { id: "lm-slk-madiwala", name: "Madiwala Lake Bund", aliases: ["Madiwala Lake"], type: "embankment", zone_id: "zone-silkboard", location: { lat: 12.921, lng: 77.617 } },
  { id: "lm-slk-depot", name: "Bommanahalli Bus Depot", aliases: ["Bommanahalli Depot"], type: "transit", zone_id: "zone-silkboard", location: { lat: 12.908, lng: 77.62 } },
  // South Bengaluru (Jayanagar)
  { id: "lm-jay-4block", name: "Jayanagar 4th Block Market", aliases: ["Jayanagar 4th Block", "Jayanagar Market"], type: "market", zone_id: "zone-jayanagar", location: { lat: 12.925, lng: 77.583 } },
  { id: "lm-jay-southend", name: "South End Circle", aliases: ["South End"], type: "transit", zone_id: "zone-jayanagar", location: { lat: 12.925, lng: 77.573 } },
  { id: "lm-jay-tilak", name: "Tilak Nagar Main Road", aliases: ["Tilak Nagar"], type: "highway", zone_id: "zone-jayanagar", location: { lat: 12.93, lng: 77.59 } },
  { id: "lm-jay-hospital", name: "Jayanagar General Hospital", aliases: ["Jayanagar Hospital"], type: "hospital", zone_id: "zone-jayanagar", location: { lat: 12.928, lng: 77.579 } },
  { id: "lm-jay-jp6", name: "JP Nagar 6th Phase Park", aliases: ["JP Nagar 6th Phase", "JP Nagar Park"], type: "residential", zone_id: "zone-jayanagar", location: { lat: 12.906, lng: 77.585 } },
  // West Bengaluru
  { id: "lm-wes-vrish", name: "Vrishabhavathi River Bridge", aliases: ["Vrishabhavathi Bridge", "Vrishabhavathi"], type: "bridge", zone_id: "zone-west", location: { lat: 12.938, lng: 77.515 } },
  { id: "lm-wes-rrarch", name: "RR Nagar Arch", aliases: ["Rajarajeshwari Nagar Arch", "RR Nagar"], type: "transit", zone_id: "zone-west", location: { lat: 12.926, lng: 77.519 } },
  { id: "lm-wes-bda", name: "Banashankari BDA Complex", aliases: ["BDA Complex Banashankari", "Banashankari BDA"], type: "market", zone_id: "zone-west", location: { lat: 12.925, lng: 77.546 } },
  { id: "lm-wes-nayandahalli", name: "Nayandahalli Junction", aliases: ["Nayandahalli"], type: "transit", zone_id: "zone-west", location: { lat: 12.945, lng: 77.527 } },
  { id: "lm-wes-rrmch", name: "Rajarajeshwari Medical College Hospital", aliases: ["RR Medical College Hospital"], type: "hospital", zone_id: "zone-west", location: { lat: 12.902, lng: 77.512 } },
  // North Bengaluru (Hebbal)
  { id: "lm-heb-flyover", name: "Hebbal Flyover", aliases: ["Hebbal Bridge"], type: "highway", zone_id: "zone-hebbal", location: { lat: 13.035, lng: 77.59 } },
  { id: "lm-heb-lake", name: "Hebbal Lake Bund", aliases: ["Hebbal Lake", "Hebbal Lake Viewpoint"], type: "embankment", zone_id: "zone-hebbal", location: { lat: 13.045, lng: 77.591 } },
  { id: "lm-heb-kempapura", name: "Kempapura Main Road", aliases: ["Kempapura Road"], type: "highway", zone_id: "zone-hebbal", location: { lat: 13.038, lng: 77.596 } },
  { id: "lm-heb-substation", name: "Kempapura Substation", aliases: ["Kempapura Power Substation"], type: "industrial", zone_id: "zone-hebbal", location: { lat: 13.038, lng: 77.598 } },
  { id: "lm-heb-nagawara", name: "Nagawara Junction", aliases: ["Nagawara"], type: "transit", zone_id: "zone-hebbal", location: { lat: 13.022, lng: 77.621 } },
  // Yelahanka
  { id: "lm-yel-kogilu", name: "Kogilu Cross", aliases: ["Kogilu Junction"], type: "transit", zone_id: "zone-yelahanka", location: { lat: 13.095, lng: 77.594 } },
  { id: "lm-yel-busstand", name: "Yelahanka New Town Bus Stand", aliases: ["Yelahanka Bus Stand", "Yelahanka New Town"], type: "transit", zone_id: "zone-yelahanka", location: { lat: 13.1, lng: 77.596 } },
  { id: "lm-yel-alla", name: "Allalasandra Lake Bund", aliases: ["Allalasandra Lake"], type: "embankment", zone_id: "zone-yelahanka", location: { lat: 13.093, lng: 77.587 } },
  { id: "lm-yel-hosp", name: "Yelahanka Government Hospital", aliases: ["Yelahanka Hospital"], type: "hospital", zone_id: "zone-yelahanka", location: { lat: 13.1, lng: 77.589 } },
  { id: "lm-yel-layout", name: "Kogilu Layout Main Road", aliases: ["Kogilu Layout"], type: "residential", zone_id: "zone-yelahanka", location: { lat: 13.097, lng: 77.597 } },
  // ORR IT corridor
  { id: "lm-orr-ecospace", name: "Ecospace Business Park", aliases: ["Ecospace", "Ecospace Tech Park"], type: "commercial", zone_id: "zone-orr", location: { lat: 12.9305, lng: 77.689 } },
  { id: "lm-orr-kadubeesanahalli", name: "Kadubeesanahalli Junction", aliases: ["Kadubeesanahalli", "Kadubeesanahalli Signal"], type: "transit", zone_id: "zone-orr", location: { lat: 12.935, lng: 77.6835 } },
  { id: "lm-orr-devara", name: "Devarabeesanahalli Lake Bund", aliases: ["Devarabeesanahalli Lake"], type: "embankment", zone_id: "zone-orr", location: { lat: 12.937, lng: 77.686 } },
  { id: "lm-orr-embassy", name: "Embassy Tech Village Gate", aliases: ["Embassy Tech Village"], type: "commercial", zone_id: "zone-orr", location: { lat: 12.934, lng: 77.691 } },
  { id: "lm-orr-marathahalli", name: "Marathahalli Bridge", aliases: ["Marathahalli"], type: "bridge", zone_id: "zone-orr", location: { lat: 12.956, lng: 77.698 } },
  // Bellandur–Yemalur
  { id: "lm-bel-gate", name: "Bellandur Lake Gate", aliases: ["Bellandur Lake Gate", "Bellandur Lake"], type: "embankment", zone_id: "zone-bellandur", location: { lat: 12.941, lng: 77.665 } },
  { id: "lm-bel-rainbow", name: "Rainbow Drive Layout", aliases: ["Rainbow Drive"], type: "residential", zone_id: "zone-bellandur", location: { lat: 12.918, lng: 77.657 } },
  { id: "lm-bel-yemalur", name: "Yemalur Main Road", aliases: ["Yemalur"], type: "highway", zone_id: "zone-bellandur", location: { lat: 12.936, lng: 77.671 } },
  { id: "lm-bel-petrol", name: "Bellandur Petrol Bunk Junction", aliases: ["Bellandur Junction"], type: "transit", zone_id: "zone-bellandur", location: { lat: 12.93, lng: 77.661 } },
  { id: "lm-bel-varthurweir", name: "Varthur Weir Road", aliases: ["Varthur Weir"], type: "highway", zone_id: "zone-bellandur", location: { lat: 12.933, lng: 77.673 } },
  // Whitefield–Varthur
  { id: "lm-whf-itpl", name: "ITPL Main Gate", aliases: ["ITPL", "ITPL Gate"], type: "commercial", zone_id: "zone-whitefield", location: { lat: 12.986, lng: 77.736 } },
  { id: "lm-whf-hopefarm", name: "Hope Farm Junction", aliases: ["Hope Farm"], type: "transit", zone_id: "zone-whitefield", location: { lat: 12.976, lng: 77.748 } },
  { id: "lm-whf-hoodi", name: "Hoodi Circle", aliases: ["Hoodi"], type: "transit", zone_id: "zone-whitefield", location: { lat: 12.991, lng: 77.716 } },
  { id: "lm-whf-community", name: "Whitefield Community Hall", aliases: ["Whitefield Relief Camp", "Whitefield Community Centre"], type: "relief_camp", zone_id: "zone-whitefield", location: { lat: 12.978, lng: 77.748 } },
  { id: "lm-whf-varthurkodi", name: "Varthur Road Kodi", aliases: ["Varthur Kodi"], type: "highway", zone_id: "zone-whitefield", location: { lat: 12.969, lng: 77.727 } },
  // Thanisandra–Jakkur
  { id: "lm-nor-culvert", name: "Kogilu-Thanisandra Culvert", aliases: ["Kogilu-Thanisandra Culvert", "Thanisandra Culvert"], type: "bridge", zone_id: "zone-north", location: { lat: 13.0705, lng: 77.6355 } },
  { id: "lm-nor-mainroad", name: "Thanisandra Main Road", aliases: ["Thanisandra"], type: "highway", zone_id: "zone-north", location: { lat: 13.0712, lng: 77.6368 } },
  { id: "lm-nor-jakkur", name: "Jakkur Aerodrome", aliases: ["Jakkur Airport"], type: "transit", zone_id: "zone-north", location: { lat: 13.078, lng: 77.607 } },
  { id: "lm-nor-jakkurlake", name: "Jakkur Lake Bund", aliases: ["Jakkur Lake"], type: "embankment", zone_id: "zone-north", location: { lat: 13.075, lng: 77.642 } },
  { id: "lm-nor-school", name: "Thanisandra Government School", aliases: ["Thanisandra School"], type: "school", zone_id: "zone-north", location: { lat: 13.068, lng: 77.63 } },
];

export function districtForZone(zoneId) {
  const zone = ZONES.find((entry) => entry.id === zoneId);
  if (!zone) throw new Error(`Unknown zone ${zoneId}`);
  return zone.district;
}

export function landmarkById(id) {
  const landmark = LANDMARKS.find((entry) => entry.id === id);
  if (!landmark) throw new Error(`Unknown landmark ${id}`);
  return landmark;
}

// ---------------------------------------------------------------------------
// Hidden ground truth: 10 backbone incidents.
// Timestamps are synthetic but sit on the real Aug–Sep 2022 flood dates.
// ---------------------------------------------------------------------------

export const BACKBONE = [
  {
    id: "bb-001",
    event_at: "2022-08-30T04:30:00Z",
    event_at_precision: "hour",
    district: "Mahadevapura",
    sub_location: "Kadubeesanahalli / Ecospace ORR",
    lat: 12.933,
    lng: 77.686,
    event_type: "flood_surge",
    people_affected: { min: 180, max: 400 },
    deaths: "Unknown",
    villages_affected: 9,
    access_status: "cut_off",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "ORR service roads between Ecospace and Kadubeesanahalli were under water on 30 Aug; commuters were stranded for hours while two-wheelers stalled in ankle-to-knee water.",
    hotspot_weights: [
      { landmark: "lm-orr-ecospace", tone: "shallow", count: 32, final: { band: "knee", access: "blocked", people: 4, vuln: "none" } },
      { landmark: "lm-orr-kadubeesanahalli", tone: "serious", count: 15, final: { band: "above_head", access: "road_cut", people: 34, vuln: "mixed" } },
    ],
    rumour_count: 8,
    rumour_landmark: "lm-cen-mgroad",
  },
  {
    id: "bb-002",
    event_at: "2022-08-31T06:00:00Z",
    event_at_precision: "hour",
    district: "Mahadevapura",
    sub_location: "Rainbow Drive Layout, Bellandur",
    lat: 12.918,
    lng: 77.657,
    event_type: "rescue",
    people_affected: { min: 60, max: 120 },
    deaths: 1,
    villages_affected: "Unknown",
    access_status: "ok",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "Basements at Rainbow Drive Layout flooded overnight on 31 Aug; residents were evacuated and a protest over delayed pumping was logged.",
    hotspot_weights: [
      { landmark: "lm-bel-rainbow", tone: "rescue", count: 24, final: { band: "waist", access: "blocked", people: 18, vuln: "none" } },
      { landmark: "lm-bel-petrol", tone: "rescue", count: 2, final: { band: "knee", access: "blocked", people: 12, vuln: "none" } },
    ],
  },
  {
    id: "bb-003",
    event_at: "2022-08-31T09:30:00Z",
    event_at_precision: "hour",
    district: "Mahadevapura",
    sub_location: "Bellandur Lake Gate / Yemalur",
    lat: 12.941,
    lng: 77.665,
    event_type: "breach",
    people_affected: { min: 150, max: 300 },
    deaths: "Unknown",
    villages_affected: 6,
    access_status: "boat_only",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "Bellandur lake gate overflow entered Yemalur low-lying streets on 31 Aug, flooding homes to chest depth and cutting the approach road.",
    hotspot_weights: [
      { landmark: "lm-bel-gate", tone: "breach", count: 26, final: { band: "knee", access: "boat", people: 30, vuln: "pregnant" } },
      { landmark: "lm-bel-yemalur", tone: "breach", count: 6, final: { band: "knee", access: "boat", people: 24, vuln: "pregnant" } },
    ],
  },
  {
    id: "bb-004",
    event_at: "2022-09-01T05:00:00Z",
    event_at_precision: "hour",
    district: "West Bengaluru",
    sub_location: "Vrishabhavathi river, RR Nagar",
    lat: 12.938,
    lng: 77.515,
    event_type: "flood_surge",
    people_affected: { min: 200, max: 450 },
    deaths: "Unknown",
    villages_affected: 11,
    access_status: "cut_off",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "The Vrishabhavathi overflowed at RR Nagar and Nayandahalli on 1 Sep; riverside colonies were cut off and homes flooded to waist depth.",
    hotspot_weights: [
      { landmark: "lm-wes-vrish", tone: "serious", count: 24, final: { band: "above_head", access: "road_cut", people: 38, vuln: "mixed" } },
      { landmark: "lm-wes-rrarch", tone: "serious", count: 6, final: { band: "chest", access: "road_cut", people: 30, vuln: "mixed" } },
    ],
  },
  {
    id: "bb-005",
    event_at: "2022-09-02T08:00:00Z",
    event_at_precision: "hour",
    district: "South East Bengaluru",
    sub_location: "Ejipura Junction / Koramangala JNC",
    lat: 12.934,
    lng: 77.623,
    event_type: "flood_surge",
    people_affected: { min: 80, max: 160 },
    deaths: "Unknown",
    villages_affected: 4,
    access_status: "cut_off",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "The Ejipura junction underpass filled within minutes on 2 Sep and commuters raised near-identical alarms across calls, SMS and social posts.",
    hotspot_weights: [
      { landmark: "lm-kor-ejipura", tone: "serious", count: 40, final: { band: "knee", access: "road_cut", people: 26, vuln: "children" } },
      { landmark: "lm-kor-jnc", tone: "serious", count: 5, final: { band: "knee", access: "road_cut", people: 18, vuln: "children" } },
    ],
  },
  {
    id: "bb-006",
    event_at: "2022-09-03T04:45:00Z",
    event_at_precision: "hour",
    district: "Yelahanka",
    sub_location: "Kogilu Cross, Yelahanka",
    lat: 13.095,
    lng: 77.594,
    event_type: "flood_surge",
    people_affected: { min: 220, max: 500 },
    deaths: "Unknown",
    villages_affected: 7,
    access_status: "cut_off",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "Kogilu Cross low-income layouts flooded on 3 Sep after a storm drain choked; very few messages reached the control room despite severe need.",
    hotspot_weights: [
      { landmark: "lm-yel-kogilu", tone: "serious", count: 16, final: { band: "knee", access: "boat", people: 34, vuln: "pregnant" } },
      { landmark: "lm-yel-layout", tone: "serious", count: 2, final: { band: "knee", access: "road_cut", people: 20, vuln: "elderly" } },
    ],
  },
  {
    id: "bb-007",
    event_at: "2022-09-03T09:00:00Z",
    event_at_precision: "hour",
    district: "Bommanahalli",
    sub_location: "Silk Board Junction",
    lat: 12.9175,
    lng: 77.622,
    event_type: "flood_surge",
    people_affected: { min: 120, max: 260 },
    deaths: "Unknown",
    villages_affected: 3,
    access_status: "ok",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "Silk Board junction was gridlocked on 3 Sep with knee-deep water around the flyover piers; two-wheelers were abandoned on the median.",
    hotspot_weights: [
      { landmark: "lm-slk-silk", tone: "serious", count: 20, final: { band: "knee", access: "blocked", people: 22, vuln: "none" } },
      { landmark: "lm-slk-madiwala", tone: "serious", count: 4, final: { band: "knee", access: "blocked", people: 14, vuln: "none" } },
    ],
  },
  {
    id: "bb-008",
    event_at: "2022-09-04T05:30:00Z",
    event_at_precision: "hour",
    district: "Yelahanka",
    sub_location: "Kogilu-Thanisandra Culvert, Jakkur",
    lat: 13.0705,
    lng: 77.6355,
    event_type: "bridge_failure",
    people_affected: { min: 90, max: 200 },
    deaths: "Unknown",
    villages_affected: 5,
    access_status: "cut_off",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "The Kogilu-Thanisandra culvert collapsed early on 4 Sep; the Jakkur wetland overflowed and the only all-weather road link was severed.",
    hotspot_weights: [
      { landmark: "lm-nor-culvert", tone: "bridge", count: 17, final: { band: "above_head", access: "road_cut", people: 44, vuln: "mixed" } },
      { landmark: "lm-nor-mainroad", tone: "bridge", count: 3, final: { band: "chest", access: "road_cut", people: 30, vuln: "mixed" } },
    ],
  },
  {
    id: "bb-009",
    event_at: "2022-09-04T12:00:00Z",
    event_at_precision: "hour",
    district: "North Bengaluru",
    sub_location: "Hebbal Lake / Kempapura",
    lat: 13.045,
    lng: 77.591,
    event_type: "flood_surge",
    people_affected: { min: 140, max: 320 },
    deaths: "Unknown",
    villages_affected: 5,
    access_status: "boat_only",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "The Hebbal lake bund seeped on 4 Sep and Kempapura streets flooded; a transformer sparking in the water forced a local shutdown.",
    hotspot_weights: [
      { landmark: "lm-heb-lake", tone: "serious", count: 22, final: { band: "knee", access: "road_cut", people: 24, vuln: "elderly" } },
      { landmark: "lm-heb-flyover", tone: "serious", count: 4, final: { band: "knee", access: "road_cut", people: 12, vuln: "none" } },
      { landmark: "lm-heb-substation", tone: "electrical", count: 4 },
      { landmark: "lm-heb-kempapura", tone: "serious", count: 2, final: { band: "knee", access: "blocked", people: 24, vuln: "pregnant" } },
    ],
  },
  {
    id: "bb-010",
    event_at: "2022-09-05T06:00:00Z",
    event_at_precision: "hour",
    district: "Mahadevapura",
    sub_location: "Whitefield / Varthur Road",
    lat: 12.978,
    lng: 77.748,
    event_type: "relief_camp",
    people_affected: { min: 300, max: 600 },
    deaths: 0,
    villages_affected: 2,
    access_status: "ok",
    outlet: "Simulated control-room log",
    url: "",
    evidence_phrase:
      "A relief camp opened at Whitefield Community Hall on 5 Sep for families displaced from Varthur Road low-lying blocks.",
    hotspot_weights: [
      { landmark: "lm-whf-community", tone: "relief", count: 18, final: { people: 320, vuln: "none", access: "ok" } },
    ],
  },
];

export const BENCHMARK_CASES = {
  case_a: { backbone_id: "bb-001", zone_id: "zone-orr", zone_name: "ORR IT Corridor (Bellandur–Kadubeesanahalli)" },
  case_b: { backbone_id: "bb-006", zone_id: "zone-yelahanka", zone_name: "Yelahanka–Kogilu" },
  case_c: { backbone_id: "bb-008", zone_id: "zone-north", zone_name: "Thanisandra–Jakkur" },
  case_d: { backbone_id: "bb-005", zone_id: "zone-koramangala", zone_name: "Koramangala–Ejipura" },
  case_e: { backbone_id: "bb-009", zone_id: "zone-hebbal", zone_name: "Hebbal–Kempapura" },
  case_f: { backbone_id: "bb-001", zone_id: "zone-central", zone_name: "Central Bengaluru (MG Road–Shivajinagar)" },
};

export const OFFICIAL_WORST_HIT = [
  { district: "Mahadevapura", peak_affected: 320000, rank: 1, note: "ORR, Bellandur and Whitefield corridors flooded across multiple days" },
  { district: "West Bengaluru", peak_affected: 180000, rank: 2, note: "Vrishabhavathi valley overflow and riverbank colony inundation" },
  { district: "Yelahanka", peak_affected: 165000, rank: 3, note: "Kogilu and Thanisandra layouts flooded; culvert collapse severed road access" },
  { district: "Bommanahalli", peak_affected: 120000, rank: 4, note: "Silk Board and Madiwala outflow ponding" },
  { district: "North Bengaluru", peak_affected: 110000, rank: 5, note: "Hebbal lake bund seepage and Kempapura substation shutdown" },
  { district: "South East Bengaluru", peak_affected: 95000, rank: 6, note: "Ejipura underpass and Koramangala valley flooding" },
];

export const SILENT_ZONES = [
  {
    zone_id: "zone-yelahanka",
    district: "Yelahanka",
    onset_time: "2022-09-03T04:45:00Z",
    reason:
      "Kogilu low-income layouts generated very few reports despite waist-deep flooding, jammed storm drains and a thin volunteer network.",
    expected_silence_score: 0.68,
    failure_mode: "storm_drain_overflow_low_connectivity",
  },
  {
    zone_id: "zone-north",
    district: "Yelahanka",
    onset_time: "2022-09-04T05:30:00Z",
    reason:
      "The Jakkur culvert collapse severed road access, fibre and tower power; the zone went quiet after the first distress calls.",
    expected_silence_score: 0.85,
    failure_mode: "culvert_collapse_telecom_blackout",
  },
];

// ---------------------------------------------------------------------------
// Sensor stations — synthetic gauge curves (no real telemetry).
// ---------------------------------------------------------------------------

export const SENSOR_STATIONS = [
  {
    id: "bellandur-lake",
    station: "Bellandur Lake",
    waterbody: "Bellandur Lake",
    zone_id: "zone-bellandur",
    district: "Mahadevapura",
    lat: 12.941,
    lng: 77.665,
    base_cm: 172,
    amplitude_cm: 128,
    peak_at: "2022-09-01T06:00:00Z",
    sigma_days: 1.9,
    warning_cm: 240,
    danger_cm: 260,
  },
  {
    id: "varthur-lake",
    station: "Varthur Lake Weir",
    waterbody: "Varthur Lake",
    zone_id: "zone-whitefield",
    district: "Mahadevapura",
    lat: 12.946,
    lng: 77.691,
    base_cm: 188,
    amplitude_cm: 108,
    peak_at: "2022-08-31T18:00:00Z",
    sigma_days: 2.1,
    warning_cm: 250,
    danger_cm: 270,
  },
  {
    id: "hebbal-lake",
    station: "Hebbal Lake",
    waterbody: "Hebbal Lake",
    zone_id: "zone-hebbal",
    district: "North Bengaluru",
    lat: 13.045,
    lng: 77.591,
    base_cm: 152,
    amplitude_cm: 100,
    peak_at: "2022-09-04T12:00:00Z",
    sigma_days: 1.7,
    warning_cm: 205,
    danger_cm: 225,
  },
  {
    id: "vrishabhavathi",
    station: "Vrishabhavathi at Nayandahalli",
    waterbody: "Vrishabhavathi",
    zone_id: "zone-west",
    district: "West Bengaluru",
    lat: 12.945,
    lng: 77.527,
    base_cm: 254,
    amplitude_cm: 126,
    peak_at: "2022-09-01T00:00:00Z",
    sigma_days: 2.0,
    warning_cm: 320,
    danger_cm: 340,
  },
  {
    id: "agara-lake",
    station: "Agara Lake",
    waterbody: "Agara Lake",
    zone_id: "zone-silkboard",
    district: "Bommanahalli",
    lat: 12.922,
    lng: 77.641,
    base_cm: 142,
    amplitude_cm: 98,
    peak_at: "2022-09-03T06:00:00Z",
    sigma_days: 1.8,
    warning_cm: 200,
    danger_cm: 220,
  },
];

// ---------------------------------------------------------------------------
// Official bulletins — generic roles only, no personal names, no URLs.
// ---------------------------------------------------------------------------

export const OFFICIAL_BULLETINS = [
  {
    id: "off-001",
    timestamp: "2022-08-30T05:30:00Z",
    source_org: "BBMP Control Room",
    district: "Mahadevapura",
    location: { lat: 12.933, lng: 77.686, name: "ORR Control Point, Kadubeesanahalli" },
    raw_text:
      "BBMP CONTROL ROOM BULLETIN: Heavy overnight rain has inundated the ORR service roads near Kadubeesanahalli and Ecospace. Stormwater pumping units and traffic marshals are deployed. Residents are advised to avoid underpasses until water recedes.",
    facts: { affected_zones: 3, population_affected: 42000, relief_camps: 2, deaths: 0 },
  },
  {
    id: "off-002",
    timestamp: "2022-08-31T07:00:00Z",
    source_org: "KSNDMC",
    district: "North Bengaluru",
    location: { lat: 13.035, lng: 77.59, name: "North Bengaluru rainfall grid" },
    raw_text:
      "KSNDMC RAINFALL ADVISORY: Very heavy rain expected over North Bengaluru through the next 24 hours. Lake catchments at Hebbal, Jakkur and Yelahanka are rising. Citizens should avoid riverbank and lake bund roads.",
    facts: { affected_zones: 4, population_affected: 68000, relief_camps: 0, deaths: 0 },
  },
  {
    id: "off-003",
    timestamp: "2022-08-31T10:00:00Z",
    source_org: "BBMP Control Room",
    district: "Mahadevapura",
    location: { lat: 12.941, lng: 77.665, name: "Bellandur Lake Gate" },
    raw_text:
      "BELLANDUR GATE ADVISORY: Lake gate operations are under way after the inflow crossed the weir. Low-lying homes in Yemalur, Bellandur and Rainbow Drive should shift valuables to upper floors. Rescue boats are on standby.",
    facts: { affected_zones: 2, population_affected: 51000, relief_camps: 3, deaths: 0 },
  },
  {
    id: "off-004",
    timestamp: "2022-09-01T06:00:00Z",
    source_org: "BWSSB",
    district: "West Bengaluru",
    location: { lat: 12.938, lng: 77.515, name: "Vrishabhavathi River Bridge" },
    raw_text:
      "BWSSB VALLEY ADVISORY: Vrishabhavathi valley drains are carrying sewage-mixed stormwater after last night's rainfall. Riverbank roads at Nayandahalli and RR Nagar are unsafe. Avoid contact with the water.",
    facts: { affected_zones: 3, population_affected: 74000, relief_camps: 4, deaths: 0 },
  },
  {
    id: "off-005",
    timestamp: "2022-09-02T09:00:00Z",
    source_org: "BBMP Control Room",
    district: "South East Bengaluru",
    location: { lat: 12.934, lng: 77.623, name: "Ejipura Junction" },
    raw_text:
      "TRAFFIC ADVISORY: The Ejipura junction underpass is flooded and closed. Traffic is diverted via Koramangala JNC and Sony World Signal. Do not enter the underpass on foot. Pumping has started.",
    facts: { affected_zones: 2, population_affected: 36000, relief_camps: 1, deaths: 0 },
  },
  {
    id: "off-006",
    timestamp: "2022-09-03T05:30:00Z",
    source_org: "SDRF Karnataka",
    district: "Yelahanka",
    location: { lat: 13.095, lng: 77.594, name: "Kogilu Cross" },
    raw_text:
      "SDRF DEPLOYMENT NOTE: Teams with inflatable boats have been positioned at Kogilu Cross after layouts were inundated. Residents of Kogilu Layout are advised to move to the higher ground near the Yelahanka New Town bus stand.",
    facts: { affected_zones: 2, population_affected: 28000, relief_camps: 2, deaths: 0 },
  },
  {
    id: "off-007",
    timestamp: "2022-09-04T06:00:00Z",
    source_org: "Revenue Department",
    district: "Yelahanka",
    location: { lat: 13.0705, lng: 77.6355, name: "Kogilu-Thanisandra Culvert" },
    raw_text:
      "REVENUE DEPARTMENT SITUATION NOTE: The Kogilu-Thanisandra culvert has collapsed and the Jakkur wetland overflow is crossing the approach road. Thanisandra is accessible only via the northern diversion. Damage assessment teams are moving in.",
    facts: { affected_zones: 2, population_affected: 33000, relief_camps: 2, deaths: 0 },
  },
  {
    id: "off-008",
    timestamp: "2022-09-04T13:00:00Z",
    source_org: "BBMP Control Room",
    district: "North Bengaluru",
    location: { lat: 13.045, lng: 77.591, name: "Hebbal Lake Bund" },
    raw_text:
      "HEBBAL BUND ALERT: Seepage has been observed along the Hebbal lake bund. The Kempapura substation area has been de-energised as a precaution. Residents should stay clear of the lake bund and flooded service roads.",
    facts: { affected_zones: 2, population_affected: 46000, relief_camps: 2, deaths: 0 },
  },
  {
    id: "off-009",
    timestamp: "2022-09-05T07:00:00Z",
    source_org: "BBMP Chief Commissioner",
    district: "Central Bengaluru",
    location: { lat: 12.975, lng: 77.6, name: "BBMP Central Control Room" },
    raw_text:
      "BBMP CITY UPDATE: 14 relief camps are operational and water levels are receding in parts of the ORR and Koramangala corridors. Damage assessment for flooded layouts has started. Citizens are requested to report unreached pockets to the control room.",
    facts: { affected_zones: 8, population_affected: 210000, relief_camps: 14, deaths: 1 },
  },
];

// ---------------------------------------------------------------------------
// Eight synthetic public posts (fictional handles, no URLs).
// ---------------------------------------------------------------------------

export const SOCIAL_POSTS = [
  {
    id: "soc-sim-01",
    timestamp: "2022-08-30T05:05:00Z",
    district: "Mahadevapura",
    location_hint: { lat: 12.935, lng: 77.6835, name: "Kadubeesanahalli Junction" },
    sender_id: "x-blr-traffic-watch",
    raw_text:
      "ORR near Kadubeesanahalli is a river. Buses stuck for 40 minutes, people walking on the median. Avoid the service road! #BengaluruRains #ORR",
    likes: 412,
  },
  {
    id: "soc-sim-02",
    timestamp: "2022-08-31T07:12:00Z",
    district: "Mahadevapura",
    location_hint: { lat: 12.918, lng: 77.657, name: "Rainbow Drive Layout" },
    sender_id: "x-rainbow-resident",
    raw_text:
      "Rainbow Drive basement parking is fully flooded, pumps are not working since last night. Families on the ground floor are shifting upstairs. #Bellandur #BengaluruFloods",
    likes: 866,
  },
  {
    id: "soc-sim-03",
    timestamp: "2022-08-31T10:20:00Z",
    district: "Mahadevapura",
    location_hint: { lat: 12.936, lng: 77.671, name: "Yemalur Main Road" },
    sender_id: "x-yemalur-voice",
    raw_text:
      "Bellandur lake gate overflow has reached Yemalur Main Road. Water is waist deep near the apartment gate. Please send boats for the elderly. #BengaluruFloods #SOS",
    likes: 1204,
  },
  {
    id: "soc-sim-04",
    timestamp: "2022-09-01T05:40:00Z",
    district: "West Bengaluru",
    location_hint: { lat: 12.938, lng: 77.515, name: "Vrishabhavathi River Bridge" },
    sender_id: "x-vrishabhavathi-watch",
    raw_text:
      "Vrishabhavathi is flowing over the bridge at RR Nagar side. The smell is unbearable and the colony road is cut off. #BengaluruFloods",
    likes: 534,
  },
  {
    id: "soc-sim-05",
    timestamp: "2022-09-02T08:12:00Z",
    district: "South East Bengaluru",
    location_hint: { lat: 12.934, lng: 77.623, name: "Ejipura Junction Underpass" },
    sender_id: "x-koramangala-rwa",
    raw_text:
      "Ejipura underpass is chest deep within ten minutes of rain. Two autos are stuck at the mouth. Police have closed the road. #BengaluruTraffic #Flood",
    likes: 723,
  },
  {
    id: "soc-sim-06",
    timestamp: "2022-09-03T05:05:00Z",
    district: "Yelahanka",
    location_hint: { lat: 13.095, lng: 77.594, name: "Kogilu Cross" },
    sender_id: "x-yelahanka-care",
    raw_text:
      "Kogilu Cross is underwater, the storm drain is choked with silt. Around 30 families are shifting to the school building. We need drinking water here. #Yelahanka #BengaluruFloods",
    likes: 198,
  },
  {
    id: "soc-sim-07",
    timestamp: "2022-09-04T05:45:00Z",
    district: "Yelahanka",
    location_hint: { lat: 13.0705, lng: 77.6355, name: "Kogilu-Thanisandra Culvert" },
    sender_id: "x-thanisandra-voice",
    raw_text:
      "The culvert near Jakkur is gone, entire road edge washed away. Thanisandra side has no power and no mobile signal. Nobody is able to reach us. #BengaluruFloods",
    likes: 312,
  },
  {
    id: "soc-sim-08",
    timestamp: "2022-09-04T12:30:00Z",
    district: "North Bengaluru",
    location_hint: { lat: 13.045, lng: 77.591, name: "Hebbal Lake Bund" },
    sender_id: "x-hebbal-lakeside",
    raw_text:
      "Hebbal lake bund is seeping near the walking track. Kempapura road has knee-deep water and the power was cut after a sparking transformer. #Hebbal #BengaluruFloods",
    likes: 447,
  },
];

// ---------------------------------------------------------------------------
// Text building blocks for the 300 reconstructed citizen reports.
// ---------------------------------------------------------------------------

export const BANDS = {
  ankle: { label: "ankle", cm: 15 },
  knee: { label: "knee", cm: 48 },
  waist: { label: "waist", cm: 95 },
  chest: { label: "chest", cm: 125 },
  above_head: { label: "above head", cm: 300 },
};

export const TONE_BANDS = {
  shallow: ["ankle", "knee"],
  serious: ["knee", "waist", "chest", "above_head"],
  rescue: ["ankle", "knee", "waist"],
  breach: ["waist", "chest"],
  bridge: ["knee", "waist"],
  electrical: ["knee", "waist", "chest"],
};

export const SERIOUS_VULN = [
  "",
  "Two elderly people and a child are with us.",
  "A pregnant woman and an elderly couple are in the trapped group.",
  "One bedridden elderly person is with us and needs help.",
  "Three children are on the first floor with us.",
  "An elderly woman cannot walk and is waiting with us.",
];

export const SERIOUS_ACCESS = [
  "The road is cut off and no vehicle can reach us.",
  "Only a boat can reach this spot now.",
  "Traffic is completely stalled and the underpass is blocked.",
  "The lane is inaccessible and the approach road is submerged.",
  "",
];

export const SHALLOW_ACCESS = [
  "Traffic is completely stalled.",
  "The service road is blocked for two-wheelers.",
  "",
  "",
];

export const RESCUE_VULN = [
  "",
  "Two elderly residents were carried out on chairs.",
  "A pregnant woman was taken out first.",
  "Children from the ground floor are with the rescue team.",
];

export const RESCUE_ACCESS = [
  "The road is blocked but rescue vans are getting through.",
  "Ambulances are waiting at the layout gate.",
  "",
];

export const SHALLOW_TEMPLATES = [
  "Waterlogging at {loc}: service road under ankle-deep water ({cm}cm). Commuters are stranded in stalled traffic. {access}",
  "{loc} is flooded again. Knee-deep water ({cm}cm) for the third time this week. 6 people stuck on the divider, two-wheelers stalled. {access}",
  "Traffic chaos at {loc}. Ankle-to-knee water ({cm}cm). 4 passengers stranded in a cab for 40 minutes. No drain cleaning on the ORR.",
  "Can't believe {loc} is flooded AGAIN. Ankle deep ({cm}cm) but the whole road is crawling. 3 kids in my cab are scared. #BengaluruFloods",
  "Third day of waterlogging at {loc}. Ankle-deep ({cm}cm) outside the office. No one from the stormwater team has come yet.",
  "Office commute update: {loc} has knee-high water ({cm}cm). 5 people are stuck on the divider at the bus stop, autos refusing to go further. {access}",
  "Small puddle outside {loc} has become knee-deep ({cm}cm) after one hour of rain. Two-wheelers are being pushed. Avoid this stretch.",
];

export const SERIOUS_TEMPLATES = [
  "Emergency at {loc}. The stormwater drain overflowed and {n} residents are trapped on the first floor. Water is {band} deep ({cm}cm) and rising. {vuln} {access}",
  "SOS from {loc}! {n} people are stranded on the terrace after the drain burst. Water is {band} level ({cm}cm), with a strong current on the road. {vuln} {access}",
  "Reporting from {loc}. We are trapped inside the building, water at {band} level ({cm}cm) and still rising. {vuln} {access}",
  "{loc} is flooded badly. {n} families are stuck on the roof, {band}-deep water ({cm}cm) below. Heavy current near the underpass. {vuln} {access}",
  "{loc} nalli neeru {band} ide, {n} jana mane mele sikkikondiddare. Water is {cm}cm and rising. {vuln} {access}",
  "Control room, {loc} is under {band}-deep water ({cm}cm). {n} villagers are trapped and the lane is gone. {vuln} {access}",
  "Urgent from {loc}: drain water entered the ground floor at {band} level ({cm}cm). {n} people are waiting for rescue on the stairs. {vuln} {access}",
];

export const BREACH_TEMPLATES = [
  "The Bellandur lake gate breach widened overnight at {loc}. {n} houses are flooded and water is at chest level ({cm}cm). {n2} people are trapped on the roof, with a strong current outside. {vuln} {access}",
  "{loc} has flooded after the gate overflow. {n} residents are stranded, waist-deep ({cm}cm) water rushing through the layout. {vuln} {access}",
  "{loc} nalli neeru chest level ({cm}cm) ide. {n} jana sikkikondiddare, haadi kadiyagide. {vuln}",
  "The lake bund breach at {loc} is pushing water into homes. {n} families are trapped, water {band} deep ({cm}cm). {vuln} {access}",
  "Bellandur gate water is entering {loc}. {n} people are stuck in the last row of houses, {band}-deep ({cm}cm) and rising fast. {vuln} {access}",
];

export const BRIDGE_TEMPLATES = [
  "The culvert near {loc} has collapsed. {n} residents are trapped on the far side, water waist deep ({cm}cm). Debris and part of the road were washed away. {vuln} {access}",
  "Kogilu-Thanisandra Culvert collapsed after overnight rain. {n} people are stranded near Jakkur Lake, knee-deep water ({cm}cm). No vehicle can cross. {vuln}",
  "{loc} culvert collapse aagide. {n} jana sikkikondiddare, neeru {band} ide. Road cut aagide. {vuln}",
  "The road bridge at {loc} is gone. {n} families are trapped on the Thanisandra side; water is {band} deep ({cm}cm) and rising. {vuln} {access}",
  "Bridge approach at {loc} eroded and the culvert washed away. {n} people are trapped and cut off, {band} water ({cm}cm) in the lane. {vuln} {access}",
];

export const RESCUE_TEMPLATES = [
  "Hello control room, this is from {loc}. 2 injured residents are being shifted to hospital. Water is knee deep ({cm}cm) in the basement and the lift shaft is flooded. {access}",
  "{loc} rescue update: {n} residents were brought out of the basement, 2 injured persons are at the camp gate. Water is {band} deep ({cm}cm). {vuln} {access}",
  "Basements at {loc} are flooded to {band} level ({cm}cm). 4 elderly were evacuated on a tractor; one person is injured and needs an ambulance. {access}",
  "Family rescued from {loc} after water reached {band} level ({cm}cm). 1 elderly man is wounded, we have called an ambulance. {access}",
  "Rescue boats from {loc}: {n} people evacuated, 2 injured residents sent to hospital. Water is still {band} deep ({cm}cm). {vuln}",
];

export const RELIEF_TEMPLATES = [
  "Relief camp at {loc} is running with {n} people. Food, blankets and drinking water are being arranged by volunteers. The road is open and safe.",
  "{n} families have moved into the shelter at {loc}. A medical desk and clean water are available. No flooding inside the hall.",
  "Whitefield Community Hall camp update: {n} persons registered, including elderly residents. Supply trucks are reaching normally.",
  "Helping at {loc} shelter today. {n} families are here, all dry and safe. Volunteers are needed for dinner service. #BengaluruFloods",
  "Camp at {loc}: {n} people, separate area for women and children, hot meals served twice a day. The approach road is clear.",
];

export const ELECTRICAL_TEMPLATES = [
  "A live wire is sparking in waist-deep water at {loc}. {n} people are trapped nearby and a strong current is passing through the flooded compound. Keep everyone away.",
  "Transformer near {loc} is sparking; a power line fell into knee-deep water ({cm}cm). {n} residents are trapped on the staircase. Do not send volunteers without protective gear.",
  "{loc} substation area is electrified - live wire in chest-level water ({cm}cm). 2 people are stranded on a compound wall and rescue is needed urgently.",
  "Electric shock risk at {loc}: sparking transformer in {band} water ({cm}cm). {n} people are trapped behind the compound gate. The supply must be cut immediately.",
];

export const ELECTRICAL_LOCATIONS = ["lm-heb-substation"];

// ---------------------------------------------------------------------------
// Closing updates — one per hotspot. The engine's merger lets the latest
// observation set the incident's water band, trend and access status, so the
// chronologically last report of each hotspot is rewritten with a curated
// closing update. This is what keeps the end-of-replay severity ordering of
// the ten backbones faithful to the hidden ground truth (a culvert collapse
// reads worse than knee-deep ORR commute chatter) without touching counts,
// channels or timestamps.
// ---------------------------------------------------------------------------

export const FINAL_TEMPLATES = {
  shallow:
    "Waterlogging update at {loc}: service road under {band} water ({cm}cm). {n} commuters are waiting for clearance. {access}",
  serious:
    "Emergency at {loc}. The stormwater drain overflowed and {n} residents are trapped on the first floor. Water is {band} deep ({cm}cm) and still rising. {vuln} {access}",
  breach:
    "The lake bund breach at {loc} is pushing water into homes. {n} families are trapped, water {band} deep ({cm}cm) and still rising. {vuln} {access}",
  bridge:
    "The culvert near {loc} collapsed. {n} residents are trapped on the far side, water {band} deep ({cm}cm) and still rising. Debris and part of the road were washed away. {vuln} {access}",
  rescue:
    "{loc} rescue update: {n} residents were brought out of the basement, 2 injured persons are at the camp gate. Water is {band} deep ({cm}cm). {vuln} {access}",
  relief:
    "Camp at {loc}: {n} people, separate area for women and children, hot meals served twice a day. The approach road is clear.",
  electrical:
    "Transformer near {loc} is sparking; a power line fell into {band} water ({cm}cm). {n} residents are trapped on the staircase. Do not send volunteers without protective gear.",
};

export const FINAL_ACCESS = {
  ok: "",
  boat: "Only a boat can reach this spot now.",
  road_cut: "The road is cut off and no vehicle can reach us.",
  blocked: "Traffic is completely stalled and the underpass is blocked.",
};

export const FINAL_VULN = {
  none: "",
  mixed: "Two elderly people and a child are with us.",
  pregnant: "A pregnant woman and an elderly couple are in the trapped group.",
  children: "Three children are on the first floor with us.",
  elderly: "One bedridden elderly person is with us and needs help.",
};

export const SERIOUS_ACCESS_KANNADA = [
  "Boat beku, road cut aagide.",
  "Road kadiyagide, yaaru cross maadakkella aagalla.",
];

export const DISTRICT_SHORT = {
  "Central Bengaluru": "Central Bengaluru",
  "East Bengaluru": "East Bengaluru",
  "South East Bengaluru": "South East Bengaluru",
  Bommanahalli: "Bommanahalli",
  "South Bengaluru": "South Bengaluru",
  "West Bengaluru": "West Bengaluru",
  "North Bengaluru": "North Bengaluru",
  Yelahanka: "Yelahanka",
  Mahadevapura: "Mahadevapura",
};

export const CHANNEL_BAG = [
  ...Array(84).fill("call_transcript"),
  ...Array(64).fill("sms"),
  ...Array(94).fill("social"),
  ...Array(58).fill("volunteer_app"),
];
