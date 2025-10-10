/**
 * Strict validator for model output in ID-based contract
 * Validates JSON structure and ensures choice_id is from allowed enum
 * @param {string} jsonText - Raw JSON text from model
 * @param {Array} allowedIds - Array of valid choice IDs
 * @returns {Object} Validation result with { ok, choice_id, confidence, obj, reason? }
 */
export function validateChoice(jsonText, allowedIds) {
  // Parse only JSON; reject any leading/trailing prose
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, reason: "invalid_json" };
  }

  if (typeof obj !== "object" || obj === null) {
    return { ok: false, reason: "not_object" };
  }

  const { choice_id, confidence } = obj;
  if (typeof choice_id !== "string") {
    return { ok: false, reason: "missing_choice_id" };
  }

  if (!allowedIds.includes(choice_id)) {
    return { ok: false, reason: "unknown_choice_id", choice_id };
  }

  const conf = Number(confidence);
  const hasConfidence = !Number.isNaN(conf) && conf >= 0 && conf <= 1;

  return {
    ok: true,
    choice_id,
    confidence: hasConfidence ? conf : null,
    obj
  };
}
