// server/utils/hash.js - Stable hash utility for AO cluster IDs
// Simple FNV-1a 32-bit implementation for consistent hashing

/**
 * Generate a stable hash string from input string
 * @param {string} str - Input string to hash
 * @returns {string} - Stable hash as hex string
 */
export function stableHash(str) {
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }

  // Convert to positive 32-bit unsigned integer
  hash = hash >>> 0;

  // Return as 8-character hex string
  return hash.toString(16).padStart(8, '0');
}
