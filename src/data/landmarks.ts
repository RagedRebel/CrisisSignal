import { BENGALURU_GAZETTEER } from "./bengaluru";

export interface Landmark {
  id: string;
  name: string;
  aliases: string[];
  coords: { lat: number; lng: number };
  ward_id: string;
  category: "bridge" | "school" | "temple" | "hospital" | "transit" | "infrastructure" | "commercial" | "residential" | "embankment" | "relief_camp" | "admin" | "highway" | "ferry_terminal" | "industrial" | "village";
  default_uncertainty_m: number;
}

const CATEGORY_BY_TYPE: Record<string, Landmark["category"]> = {
  embankment: "embankment",
  hospital: "hospital",
  bridge: "bridge",
  relief_camp: "relief_camp",
  industrial: "industrial",
  admin: "admin",
  highway: "highway",
  ferry_terminal: "ferry_terminal",
  village: "village",
  market: "commercial",
  school: "school",
  temple: "temple",
  transit: "transit",
  commercial: "commercial",
  residential: "residential",
  infrastructure: "infrastructure",
};

export function landmarkCategoryForType(type: string): Landmark["category"] {
  return CATEGORY_BY_TYPE[type] || "infrastructure";
}

export const BENGALURU_LANDMARKS: Landmark[] = BENGALURU_GAZETTEER.map((entry) => ({
  id: entry.id,
  name: entry.name,
  aliases: entry.aliases,
  coords: entry.location,
  ward_id: entry.zone_id,
  category: landmarkCategoryForType(entry.type),
  default_uncertainty_m: entry.type === "highway" ? 180 : 150,
}));
