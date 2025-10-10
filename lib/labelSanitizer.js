/**
 * Minimal Unicode dash normalization for external inputs
 * Only fixes common UTF-8 mojibake for dashes - no truncation, no word capping
 * @param {string} input - Input string to normalize
 * @returns {string} Normalized string with proper dashes
 */
export function normalizeDashes(input = "") {
  if (input == null) return "";
  return String(input)
    .replaceAll("‚Äî", "—")
    .replaceAll("â€”", "—")
    .replaceAll("â€“", "–")
    .replaceAll("â€•", "—");
}
