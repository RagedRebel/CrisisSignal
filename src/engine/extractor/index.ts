import { ExtractedReport, ExtractedReportSchema, RawReport } from "../types";
import { extractWithRules } from "./ruleBased";

/**
 * Gemini online extractor with strict prompting and Zod validation.
 * Falls back to rule-based extractor when offline or on network error.
 */
export async function extractWithGemini(
  rawText: string,
  apiKey?: string
): Promise<{ extracted: ExtractedReport; status: "validated" | "needs_human_reading" | "malformed"; error?: string }> {
  if (!apiKey) {
    const fallback = extractWithRules(rawText);
    return { extracted: fallback, status: "validated" };
  }

  const prompt = `You are a disaster intake structuring engine. Extract structured facts from this flood report.
CRITICAL RULES:
1. NEVER invent facts. Any field not explicitly stated must be null or "none_stated".
2. Counts, measurements and locations must NEVER be guessed.
3. Every extracted field must include evidence_span with the exact phrase from raw message.
4. Output ONLY valid JSON matching this schema:
{
  "location_raw": string or null,
  "location_qualifiers": string or null,
  "people_count": {"min": number, "max": number, "exact": number} or null,
  "life_risk": "trapped" | "injured" | "unconscious" | "medically_dependent" | "none_stated",
  "vulnerable_groups": ["elderly" | "children" | "disabled" | "pregnant"],
  "water_level_cm": number or null,
  "water_band": "ankle" | "knee" | "waist" | "chest" | "above_head" | null,
  "water_trend": "rising" | "stable" | "falling" | null,
  "hazards": ["electrical" | "current" | "collapse"],
  "access_status": "road_cut" | "boat_needed" | "blocked" | "ok" | null,
  "evidence_spans": {
    "fieldName": {"text": "exact substring", "field": "fieldName", "confidence": 0.9}
  }
}

Raw Report: "${rawText}"`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const json = await res.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error("Empty Gemini response");

    const parsedJson = JSON.parse(candidateText);
    const validated = ExtractedReportSchema.safeParse(parsedJson);

    if (validated.success) {
      return { extracted: validated.data, status: "validated" };
    } else {
      // Malformed output goes to "Needs human reading" lane
      const fallback = extractWithRules(rawText);
      return {
        extracted: fallback,
        status: "needs_human_reading",
        error: `Zod validation failed: ${validated.error.message}`,
      };
    }
  } catch (err: any) {
    // Fall back to rule-based engine seamlessly
    const fallback = extractWithRules(rawText);
    return {
      extracted: fallback,
      status: "validated",
      error: `Gemini offline fallback: ${err.message}`,
    };
  }
}

/**
 * Universal Extraction Dispatcher:
 * 1. In offline mode (the shipped replay), uses the deterministic rule-based extractor.
 * 2. If an API key is supplied, optionally tries Gemini.
 * 3. Falls back to the rule-based extractor on any network or schema error.
 */
export async function processReportExtraction(
  report: RawReport,
  options?: { offlineMode?: boolean; apiKey?: string }
): Promise<{ extracted: ExtractedReport; status: "validated" | "needs_human_reading" | "malformed"; error?: string }> {
  // 1. Offline Mode or No API Key
  if (options?.offlineMode || !options?.apiKey) {
    const extracted = extractWithRules(report.raw_text, report.source_type);
    return { extracted, status: "validated" };
  }

  // 2. Online Gemini extraction
  return await extractWithGemini(report.raw_text, options.apiKey);
}
