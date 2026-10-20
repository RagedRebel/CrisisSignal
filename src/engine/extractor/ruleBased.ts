import {
  ExtractedReport,
  EvidenceSpan,
  LifeRisk,
  WaterBand,
  WaterTrend,
  Hazard,
  AccessStatus,
  SourceType,
  VulnerableGroup,
} from "../types";
import { BENGALURU_LANDMARKS } from "../../data/landmarks";

/**
 * Deterministic multilingual rule-based extractor.
 * Handles English, Kannada-influenced English (Kanglish) and Hinglish.
 * Never invents facts: missing fields remain null / "Unknown".
 * Extracts exact evidence spans with confidence.
 */

const LANDMARK_ALIASES = BENGALURU_LANDMARKS.flatMap((landmark) =>
  [landmark.name, ...landmark.aliases]
    .map((alias) => alias.trim())
    .filter((alias) => alias.length >= 4)
)
  .sort((a, b) => b.length - a.length)
  .map((alias) => ({ alias, lower: alias.toLowerCase() }));

const WORD_NUMBERS: Record<string, number> = {
  one: 1, ek: 1,
  two: 2, do: 2,
  three: 3, teen: 3,
  four: 4, chaar: 4, char: 4,
  five: 5, paanch: 5, panch: 5,
  six: 6, chhe: 6,
  seven: 7, saat: 7,
  eight: 8, aath: 8,
  nine: 9, nau: 9,
  ten: 10, das: 10,
};

const PEOPLE_NOUNS =
  "school children|children|child|kids|villagers|people|persons|residents|workers|patients|women|teachers|souls|members|passengers|families|shopkeepers|elderly|injured|pregnant women|pregnant";

function parsePeopleCount(text: string): { value: { min: number; max: number; exact?: number }; span: string } | null {
  // "15 school children and 2 teachers" / "8 elderly bedridden patients and 3 pregnant women"
  const compound = text.match(
    new RegExp(
      `(\\d+|\\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\\b)\\s*(?:[a-z-]+\\s+){0,3}(?:${PEOPLE_NOUNS})\\b\\s*(?:and|,|&)\\s*(\\d+|\\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\\b)\\s*(?:[a-z-]+\\s+){0,3}(?:${PEOPLE_NOUNS})\\b`,
      "i"
    )
  );
  if (compound) {
    const a = parseInt(compound[1], 10) || WORD_NUMBERS[compound[1].toLowerCase()] || 0;
    const b = parseInt(compound[2], 10) || WORD_NUMBERS[compound[2].toLowerCase()] || 0;
    if (a > 0 && b > 0) {
      return { value: { min: a + b, max: a + b, exact: a + b }, span: compound[0] };
    }
  }

  // "family of 6" / "group of 8" / "around 25 villagers"
  const family = text.match(
    /\b(?:family|group|team|party|batch)\s+of\s+(\d+)\b/i
  );
  if (family) {
    const n = parseInt(family[1], 10);
    return { value: { min: n, max: n, exact: n }, span: family[0] };
  }

  // "1 or 2 shopkeepers" / "15 to 20 people"
  const range = text.match(
    new RegExp(`(\\d+)\\s*(?:or|to|-|–|se)\\s*(\\d+)\\s*(?:${PEOPLE_NOUNS})?\\b`, "i")
  );
  if (range) {
    const min = parseInt(range[1], 10);
    const max = parseInt(range[2], 10);
    if (max >= min && min > 0 && max < 10000) {
      return { value: { min, max }, span: range[0] };
    }
  }

  // "around 25 villagers" / "nearly 40 layout workers"
  const approximate = text.match(
    new RegExp(`(?:around|about|nearly|approx(?:imately)?|over|more than)\\s+(\\d+)\\s*(?:[a-z-]+\\s+){0,3}(?:${PEOPLE_NOUNS})\\b`, "i")
  );
  if (approximate) {
    const n = parseInt(approximate[1], 10);
    return { value: { min: n, max: n, exact: n }, span: approximate[0] };
  }

  // "15 school children" / "8 elderly bedridden patients" / "2 injured persons"
  const single = text.match(
    new RegExp(`(\\d+)\\s*(?:[a-z-]+\\s+){0,3}(?:${PEOPLE_NOUNS})\\b`, "i")
  );
  if (single) {
    const n = parseInt(single[1], 10);
    if (n > 0 && n < 10000) {
      return { value: { min: n, max: n, exact: n }, span: single[0] };
    }
  }

  // Word-number + people noun
  const word = text.match(
    new RegExp(`\\b(one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:[a-z-]+\\s+){0,3}(?:${PEOPLE_NOUNS})\\b`, "i")
  );
  if (word) {
    const n = WORD_NUMBERS[word[1].toLowerCase()];
    if (n) return { value: { min: n, max: n, exact: n }, span: word[0] };
  }

  return null;
}

export function extractWithRules(rawText: string, sourceType: SourceType = "second_hand"): ExtractedReport {
  const text = rawText;
  const lower = rawText.toLowerCase();

  const evidence_spans: Record<string, EvidenceSpan> = {};
  const confidence_scores: Record<string, number> = {};

  // 1. Language detection
  let detectedLanguage = "en";
  if (/[\u0C80-\u0CFF]/.test(text) || /\b(neeru|jana|maneyalli|sikkikondiddare|garbhini|beku|kadiyagide|pakka|haadi|varshada|vridha|hudugiyaru)\b/i.test(text)) {
    detectedLanguage = "kannada";
  } else if (/[\u0900-\u097F]/.test(text) || /\b(paani|pani|bachao|phase|bujurg|chhat|chhat pe|doob|tez|bahav|mahilayein|bachhe|bijli|ghutne|khatra)\b/i.test(text)) {
    detectedLanguage = "hinglish";
  }

  // 2. People Count Extraction
  let people_count: { min: number; max: number; exact?: number } | null = null;
  const peopleResult = parsePeopleCount(text);
  if (peopleResult) {
    people_count = peopleResult.value;
    evidence_spans.people_count = { text: peopleResult.span, field: "people_count", confidence: 0.9 };
    confidence_scores.people_count = 0.9;
  }

  // 3. Life Risk Detection
  let life_risk: LifeRisk = "none_stated";
  if (/\b(oxygen dependent|icu patients|casualty|medically dependent|ventilator|dialysis|medicine running out|insulin)\b/i.test(lower)) {
    life_risk = "medically_dependent";
    const m = text.match(/\b(oxygen dependent[^\.,;]*|icu patients[^\.,;]*|medically dependent[^\.,;]*|dialysis[^\.,;]*|insulin[^\.,;]*)/i);
    evidence_spans.life_risk = { text: m ? m[0] : "oxygen dependent", field: "life_risk", confidence: 0.95 };
    confidence_scores.life_risk = 0.95;
  } else if (/\b(unconscious|behosh|fainted|unresponsive)\b/i.test(lower)) {
    life_risk = "unconscious";
    const m = text.match(/\b(unconscious|behosh|fainted|unresponsive)\b/i);
    evidence_spans.life_risk = { text: m ? m[0] : "unconscious", field: "life_risk", confidence: 0.95 };
    confidence_scores.life_risk = 0.95;
  } else if (/\b(injured|ghayal|chot|jakhmi|bleeding|stretcher|fracture|wounded|death|died|dead body|body recovered|killed)\b/i.test(lower)) {
    life_risk = "injured";
    const m = text.match(/\b(injured[^\.,;]*|ghayal[^\.,;]*|jakhmi[^\.,;]*|need stretcher[^\.,;]*|stretcher[^\.,;]*|fracture[^\.,;]*|death[^\.,;]*|died[^\.,;]*|dead body[^\.,;]*|body recovered[^\.,;]*|killed[^\.,;]*)/i);
    evidence_spans.life_risk = { text: m ? m[0] : "injured", field: "life_risk", confidence: 0.95 };
    confidence_scores.life_risk = 0.95;
  } else if (/\b(trapped|phase|sikkikondiddare|stranded|stuck|marooned|terrace|roof|chhat|doob|bachao|unable to walk|nadeyokke aagalla|awaiting rescue|waiting for rescue)\b/i.test(lower)) {
    life_risk = "trapped";
    const m = text.match(/\b(trapped[^\.,;]*|phase hain[^\.,;]*|sikkikondiddare[^\.,;]*|sitting on car roof|chhat par|marooned[^\.,;]*|stranded[^\.,;]*|awaiting rescue|waiting for rescue|nadeyokke aagalla[^\.,;]*)/i);
    evidence_spans.life_risk = { text: m ? m[0] : "trapped", field: "life_risk", confidence: 0.9 };
    confidence_scores.life_risk = 0.9;
  }

  // 4. Vulnerable Groups
  const vulnerable_groups: VulnerableGroup[] = [];
  if (/\b(elderly|bujurg|old age|vriddh|vridha|senior citizen|bedridden|78 varshada|80 year|dada|dadi)\b/i.test(lower)) {
    vulnerable_groups.push("elderly");
    const m = text.match(/\b(elderly|bujurg[^\.,;]*|old age[^\.,;]*|vriddh[^\.,;]*|vridha|bedridden|78 varshada)\b/i);
    if (m) evidence_spans.vulnerable_groups_elderly = { text: m[0], field: "vulnerable_groups", confidence: 0.95 };
  }
  if (/\b(children|child|bachhe|kids|infant|baby|hudugiyaru|school children)\b/i.test(lower)) {
    vulnerable_groups.push("children");
    const m = text.match(/\b(school children|children|child|bachhe|kids|infant|baby|hudugiyaru)\b/i);
    if (m) evidence_spans.vulnerable_groups_children = { text: m[0], field: "vulnerable_groups", confidence: 0.9 };
  }
  if (/\b(pregnant|garbhini|garbhavati|expecting)\b/i.test(lower)) {
    vulnerable_groups.push("pregnant");
    const m = text.match(/\b(pregnant[^\.,;]*|garbhini[^\.,;]*|garbhavati|expecting)\b/i);
    if (m) evidence_spans.vulnerable_groups_pregnant = { text: m[0], field: "vulnerable_groups", confidence: 0.98 };
  }
  if (/\b(disabled|handicapped|divyang|wheelchair|paralyzed|paralysed|oxygen dependent|kaalu novu)\b/i.test(lower)) {
    vulnerable_groups.push("disabled");
    const m = text.match(/\b(disabled|handicapped|divyang|wheelchair|paralyzed[^\.,;]*|paralysed[^\.,;]*|oxygen dependent|kaalu novu)\b/i);
    if (m) evidence_spans.vulnerable_groups_disabled = { text: m[0], field: "vulnerable_groups", confidence: 0.9 };
  }

  // 5. Water Level cm and Water Band
  let water_level_cm: number | null = null;
  let water_band: WaterBand | null = null;

  const cmMatch = text.match(/(\d{2,4})\s*(?:cm|centimeter|centimetres)\b/i);
  const feetMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b/i);

  if (cmMatch) {
    water_level_cm = parseInt(cmMatch[1], 10);
    evidence_spans.water_level_cm = { text: cmMatch[0], field: "water_level_cm", confidence: 0.98 };
    confidence_scores.water_level_cm = 0.98;
  } else if (feetMatch) {
    const feet = parseFloat(feetMatch[1]);
    water_level_cm = Math.round(feet * 30.48);
    evidence_spans.water_level_cm = { text: feetMatch[0], field: "water_level_cm", confidence: 0.9 };
    confidence_scores.water_level_cm = 0.9;
  }

  if (/\b(above head|overhead|10 feet|drowning|submerged completely|chat tak|roof level)\b/i.test(lower)) {
    water_band = "above_head";
    const m = text.match(/\b(above head|10 feet|drowning|submerged completely|roof level)\b/i);
    if (m) evidence_spans.water_band = { text: m[0], field: "water_band", confidence: 0.9 };
  } else if (/\b(chest|chhati|seene tak)\b/i.test(lower)) {
    water_band = "chest";
    const m = text.match(/\b(chest[^\.,;]*|chhati[^\.,;]*|seene tak)\b/i);
    if (m) evidence_spans.water_band = { text: m[0], field: "water_band", confidence: 0.95 };
  } else if (/\b(waist|kamar|kamara|hip)\b/i.test(lower)) {
    water_band = "waist";
    const m = text.match(/\b(waist[^\.,;]*|kamar[^\.,;]*|kamara)\b/i);
    if (m) evidence_spans.water_band = { text: m[0], field: "water_band", confidence: 0.95 };
  } else if (/\b(knee|ghutne|mokaalu|knee level|knee deep|knee water)\b/i.test(lower)) {
    water_band = "knee";
    const m = text.match(/\b(knee deep[^\.,;]*|knee level[^\.,;]*|ghutne[^\.,;]*|mokaalu|knee water)\b/i);
    if (m) evidence_spans.water_band = { text: m[0], field: "water_band", confidence: 0.95 };
  } else if (/\b(ankle|puddle|gitte|waterlogging|water logging)\b/i.test(lower)) {
    water_band = "ankle";
    const m = text.match(/\b(ankle[^\.,;]*|puddle|waterlogging|water logging)\b/i);
    if (m) evidence_spans.water_band = { text: m[0], field: "water_band", confidence: 0.85 };
  }

  // 6. Water Trend
  let water_trend: WaterTrend | null = null;
  if (/\b(rising|chadh raha|increasing|fast flow|rate of rise|speed se badh|heavy current|still rising|rising continuously)\b/i.test(lower)) {
    water_trend = "rising";
    const m = text.match(/\b(rising|chadh raha|increasing|rate of rise|water still rising|rising continuously|still rising)\b/i);
    if (m) evidence_spans.water_trend = { text: m[0], field: "water_trend", confidence: 0.9 };
  } else if (/\b(receding|falling|kam ho|ghat raha|drying)\b/i.test(lower)) {
    water_trend = "falling";
    const m = text.match(/\b(receding|falling|kam ho|water receding)\b/i);
    if (m) evidence_spans.water_trend = { text: m[0], field: "water_trend", confidence: 0.9 };
  } else if (/\b(stable|constant|same level|thahra|stagnant)\b/i.test(lower)) {
    water_trend = "stable";
    const m = text.match(/\b(stable|constant|stagnant)\b/i);
    if (m) evidence_spans.water_trend = { text: m[0], field: "water_trend", confidence: 0.85 };
  }

  // 7. Hazards
  const hazards: Hazard[] = [];
  if (/\b(electric|electrical|live wire|wire snapped|spark|sparking|transformer|power grid|power line|bijli|shock|electrocution)\b/i.test(lower)) {
    hazards.push("electrical");
    const m = text.match(/\b(electrical[^\.,;]*|live wire[^\.,;]*|wire snapped[^\.,;]*|sparking[^\.,;]*|transformer[^\.,;]*|power grid[^\.,;]*|current in water)\b/i);
    if (m) evidence_spans.hazards_electrical = { text: m[0], field: "hazards", confidence: 0.95 };
  }
  if (/\b(heavy current|strong current|strong flow|swift water|tez bahav|torrent|velocity|rushing|hazardous current)\b/i.test(lower)) {
    hazards.push("current");
    const m = text.match(/\b(heavy current[^\.,;]*|strong current[^\.,;]*|strong flow[^\.,;]*|tez bahav[^\.,;]*|torrent[^\.,;]*|hazardous current[^\.,;]*)/i);
    if (m) evidence_spans.hazards_current = { text: m[0], field: "hazards", confidence: 0.9 };
  }
  if (/\b(collapse|collapsed|gira|breach|breached|bund broke|bund washed|washed away|cracked|fall down|culvert floating)\b/i.test(lower)) {
    hazards.push("collapse");
    const m = text.match(/\b(collapse[^\.,;]*|breach[^\.,;]*|breached[^\.,;]*|bund broke[^\.,;]*|washed away[^\.,;]*|culvert floating[^\.,;]*)/i);
    if (m) evidence_spans.hazards_collapse = { text: m[0], field: "hazards", confidence: 0.92 };
  }

  // 8. Access Status — explicit road cut takes priority over "please send a boat"
  let access_status: AccessStatus | null = null;
  if (/\b(road cut|road severed|cut off|cut-off|washed out|bridge broken|bridge collapsed|kadiyagide|submerged road|100% cut off|inaccessible|no ambulance can reach|nobody can cross)\b/i.test(lower)) {
    access_status = "road_cut";
    const m = text.match(/\b(road cut[^\.,;]*|road severed[^\.,;]*|cut off[^\.,;]*|washed out[^\.,;]*|bridge collapsed[^\.,;]*|kadiyagide[^\.,;]*|inaccessible[^\.,;]*|100% cut off)\b/i);
    if (m) evidence_spans.access_status = { text: m[0], field: "access_status", confidence: 0.92 };
  } else if (/\b(boat|doni|dinghy|inflatable|ferry)\b/i.test(lower)) {
    access_status = "boat_needed";
    const m = text.match(/\b(boat needed|boat beku|boat chahiye|inflatable motorized boat|need rescue boat|send ndrf boat|country boat|ferry service)\b/i);
    if (m) evidence_spans.access_status = { text: m[0], field: "access_status", confidence: 0.92 };
  } else if (/\b(blocked|stalled|impassable|diverting|stuck traffic)\b/i.test(lower)) {
    access_status = "blocked";
    const m = text.match(/\b(blocked[^\.,;]*|stalled[^\.,;]*|traffic completely stalled)\b/i);
    if (m) evidence_spans.access_status = { text: m[0], field: "access_status", confidence: 0.88 };
  } else if (/\b(operational|clear|dry|safe)\b/i.test(lower)) {
    access_status = "ok";
    const m = text.match(/\b(operational|clear|safe|dry)\b/i);
    if (m) evidence_spans.access_status = { text: m[0], field: "access_status", confidence: 0.85 };
  }

  // 9. Location Raw & Qualifiers
  // Match against the real Bengaluru gazetteer (longest alias first) instead
  // of a fictional hard-coded landmark regex.
  let location_raw: string | null = null;
  for (const entry of LANDMARK_ALIASES) {
    if (lower.includes(entry.lower)) {
      location_raw = entry.alias;
      evidence_spans.location_raw = { text: entry.alias, field: "location_raw", confidence: 0.95 };
      confidence_scores.location_raw = 0.95;
      break;
    }
  }

  // District names are useful fallbacks even without a landmark.
  if (!location_raw) {
    const districtMatch = text.match(
      /\b(South East Bengaluru|Central Bengaluru|East Bengaluru|South Bengaluru|West Bengaluru|North Bengaluru|Bommanahalli|Mahadevapura|Yelahanka)\b/i
    );
    if (districtMatch) {
      location_raw = districtMatch[0];
      evidence_spans.location_raw = { text: districtMatch[0], field: "location_raw", confidence: 0.8 };
      confidence_scores.location_raw = 0.8;
    }
  }

  let location_qualifiers: string | null = null;
  const qualMatch = text.match(
    /\b(behind the school|behind temple|across the river|near the old bridge|inside hospital|near building \d+|in front of gate \d+|opposite side|opposite the [^\.,;]*|outside [^\.,;]*|basement|lower bund|depot|border area)\b/i
  );
  if (qualMatch) {
    location_qualifiers = qualMatch[0];
  }

  return {
    location_raw,
    location_qualifiers,
    people_count,
    life_risk,
    vulnerable_groups,
    water_level_cm,
    water_band,
    water_trend,
    hazards,
    access_status,
    observed_at: null,
    reported_at: new Date().toISOString(),
    source_type: sourceType,
    language: detectedLanguage,
    confidence_scores,
    evidence_spans,
  };
}
