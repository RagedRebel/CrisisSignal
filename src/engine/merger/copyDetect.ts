/**
 * Simple text fingerprint / hash for detecting copy-pasted viral messages.
 * Normalizes punctuation, whitespace, and case.
 */
export function computeTextFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates token Jaccard similarity between two texts.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(computeTextFingerprint(textA).split(" "));
  const wordsB = new Set(computeTextFingerprint(textB).split(" "));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  Array.from(wordsA).forEach((w) => {
    if (wordsB.has(w)) intersection++;
  });

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}
