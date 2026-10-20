import Fuse from "fuse.js";
import { Landmark, landmarkCategoryForType } from "../../data/landmarks";
import { BENGALURU_GAZETTEER, BENGALURU_WARD_ZONES } from "../../data/bengaluru";

export interface GazetteerMatch {
  landmark: Landmark;
  score: number; // 0 is perfect, 1 is no match in Fuse.js
  matchType: "exact_alias" | "fuzzy_landmark" | "ward_zone";
}

interface SearchItem {
  id: string;
  name: string;
  alias: string;
  district: string;
  landmark: Landmark;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAlias(haystack: string, alias: string): boolean {
  if (!alias) return false;
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(alias)}(?:[^a-z0-9]|$)`, "i").test(haystack);
}

const searchItems: SearchItem[] = [];
for (const entry of BENGALURU_GAZETTEER) {
  const landmark: Landmark = {
    id: entry.id,
    name: entry.name,
    aliases: entry.aliases,
    coords: entry.location,
    ward_id: entry.zone_id,
    category: landmarkCategoryForType(entry.type),
    default_uncertainty_m: 150,
  };

  const aliases = new Set<string>([entry.name, ...entry.aliases]);
  // Add a couple of token-friendly variants so "Kadubeesanahalli Signal" also
  // matches the shorter "Kadubeesanahalli" phrase used in hurried messages.
  const words = entry.name.split(/\s+/).filter((word) => word.length >= 5);
  if (words.length > 0) aliases.add(words[0]);
  if (words.length > 1) aliases.add(words.slice(0, 2).join(" "));

  for (const alias of aliases) {
    searchItems.push({
      id: entry.id,
      name: entry.name,
      alias: normalize(alias),
      district: entry.district,
      landmark,
    });
  }
}

// Sort by alias length descending so specific landmarks win before substrings.
searchItems.sort((a, b) => b.alias.length - a.alias.length);

const fuse = new Fuse(searchItems, {
  keys: ["alias", "name"],
  includeScore: true,
  threshold: 0.34,
  minMatchCharLength: 4,
  ignoreLocation: true,
});

/**
 * Searches the real Bengaluru gazetteer by exact alias or fuzzy match.
 * The optional district narrows candidates when the message contains both a
 * parent district and a sub-locality (e.g. "Yemalur Road, Mahadevapura").
 */
export function matchGazetteer(
  query: string,
  options?: { district?: string | null }
): GazetteerMatch | null {
  const clean = normalize(query);
  if (!clean || clean.length < 3) return null;

  const district = options?.district?.toLowerCase() || null;
  const candidates = district
    ? searchItems.filter((item) => item.district.toLowerCase() === district)
    : searchItems;

  const pools = district && candidates.length > 0 ? [candidates, searchItems] : [searchItems];

  for (const pool of pools) {
    // 1. Exact alias containment, longest alias first.
    for (const item of pool) {
      if (item.alias.length >= 3 && containsAlias(clean, item.alias)) {
        return { landmark: item.landmark, score: 0.0, matchType: "exact_alias" };
      }
    }

    // 2. Fuzzy match for typos / truncated spellings.
    const results = fuse.search(clean);
    const filtered = pool === searchItems ? results : results.filter((r) => pool.includes(r.item));
    if (filtered.length > 0 && filtered[0].score !== undefined && filtered[0].score <= 0.4) {
      return {
        landmark: filtered[0].item.landmark,
        score: filtered[0].score,
        matchType: "fuzzy_landmark",
      };
    }
  }

  // 3. Ward / district-name fallback.
  for (const ward of BENGALURU_WARD_ZONES) {
    const districtName = (ward.district || "").toLowerCase();
    if (district && districtName !== district) continue;
    if (
      containsAlias(clean, normalize(ward.name)) ||
      (districtName && containsAlias(clean, normalize(districtName)))
    ) {
      const wardLandmark: Landmark = {
        id: `zone-${ward.id}`,
        name: ward.name,
        aliases: [ward.name, ward.district || ""].filter(Boolean),
        coords: ward.center,
        ward_id: ward.id,
        category: "residential",
        default_uncertainty_m: 12000,
      };
      return { landmark: wardLandmark, score: 0.2, matchType: "ward_zone" };
    }
  }

  return null;
}
