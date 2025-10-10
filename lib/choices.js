import fs from "node:fs";

/**
 * Load choices from labelbook for prompt construction
 * Returns all umbrellas with their: id, label, desc, anchors
 * @param {string} labelbookPath - Path to labelbook.json file
 * @returns {Array} Array of choice objects for prompts
 */
export function loadChoices(labelbookPath = "data/labelbook.json") {
  const lb = JSON.parse(fs.readFileSync(labelbookPath, "utf8"));

  // Return all umbrellas (parents and children)
  return (lb.umbrellas || [])
    .map(x => ({
      id: x.id,
      label: x.name,
      desc: x.definition || "",
      anchors: x.aliases || []
    }));
}

/**
 * Get all valid choice IDs from the labelbook
 * @param {string} labelbookPath - Path to labelbook.json file
 * @returns {Array} Array of valid choice IDs
 */
export function getValidChoiceIds(labelbookPath = "data/labelbook.json") {
  const choices = loadChoices(labelbookPath);
  return choices.map(c => c.id);
}

/**
 * Create ID to label mapping for output conversion
 * @param {string} labelbookPath - Path to labelbook.json file
 * @returns {Object} Map of choice_id -> canonical label
 */
export function createIdToLabelMap(labelbookPath = "data/labelbook.json") {
  const choices = loadChoices(labelbookPath);
  const map = {};
  for (const choice of choices) {
    map[choice.id] = choice.label;
  }
  return map;
}
