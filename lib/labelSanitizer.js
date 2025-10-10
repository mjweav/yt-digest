/**
 * normalizeLabel(raw, allowedSet)
 *  - Fix common UTF-8 mojibake for dashes: '‚Äî','â€”','â€“','â€•' → proper '—' or '–'
 *  - Trim leading/trailing whitespace
 *  - Truncate at first separator among: em dash (—), en dash (–), colon (:), middle dot (·)
 *  - Cap to <= 3 words (keep first 1–3 words)
 *  - Case-normalize to Title Case (preserve common acronyms: AI, HTML, CSS, SQL)
 *  - If result case-insensitively equals an item from allowedSet → return the canonical casing from allowedSet
 *  - If not in allowedSet → return null (caller will decide Unclassified low-confidence)
 */
function normalizeLabel(raw, allowedSet) {
  if (!raw || typeof raw !== 'string') return null;

  // Fix common UTF-8 mojibake for dashes before splitting on separators
  let normalized = raw
    .replace(/‚Äî/g, '—')  // Fix mojibake em dash
    .replace(/â€”/g, '—')  // Fix mojibake em dash variant
    .replace(/â€“/g, '–')  // Fix mojibake en dash
    .replace(/â€•/g, '—') // Fix mojibake horizontal bar
    .trim();

  if (!normalized) return null;

  // Truncate at first separator among: em dash (—), en dash (–), colon (:), middle dot (·)
  const separatorRegex = /[—–:\u00b7]/;
  const separatorMatch = normalized.match(separatorRegex);
  if (separatorMatch) {
    normalized = normalized.substring(0, separatorMatch.index).trim();
  }

  if (!normalized) return null;

  // Cap to <= 3 words (keep first 1–3 words)
  let words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    words = words.slice(0, 3);
    normalized = words.join(' ');
  }

  if (!normalized) return null;

  // Case-normalize to Title Case (preserve common acronyms: AI, HTML, CSS, SQL)
  const commonAcronyms = new Set(['AI', 'HTML', 'CSS', 'SQL', 'API', 'URL', 'HTTP', 'HTTPS', 'XML', 'JSON', 'PDF', 'CEO', 'CTO', 'GPU', 'CPU', 'RAM', 'DNS', 'IP', 'VPN', 'USB', 'TV', 'DIY', 'FAQ', 'USA', 'UK', 'EU', 'UN', 'NASA', 'FBI', 'CIA', 'BBC', 'CNN', 'ABC', 'NBC', 'CBS', 'FOX', 'ESPN', 'NFL', 'NBA', 'MLB', 'NHL', 'UFC', 'FIFA', 'UEFA', 'ATP', 'WTA', 'PGA', 'LPGA', 'NASCAR', 'F1', 'NHL', 'MLB', 'NBA', 'NFL']);

  const titleCaseWords = words.map(word => {
    // Preserve common acronyms and all-caps words
    if (commonAcronyms.has(word.toUpperCase()) || word === word.toUpperCase()) {
      return word;
    }
    // Handle words with ampersand (e.g., "R&D")
    if (word.includes('&')) {
      return word.split('&').map(part => {
        const trimmed = part.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      }).join('&');
    }
    // Standard title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  const originalNormalized = normalized;
  normalized = titleCaseWords.join(' ');

  // Debug logging
  if (process.env.DEBUG_LABEL_SANITIZER) {
    console.log('DEBUG normalizeLabel:', {
      input: raw,
      afterMojibake: originalNormalized,
      words,
      titleCaseWords,
      final: normalized,
      allowedSetSize: allowedSet ? allowedSet.size : 0,
      allowedSet: allowedSet ? [...allowedSet] : []
    });
  }

  // If result case-insensitively equals an item from allowedSet → return the canonical casing from allowedSet
  if (allowedSet && allowedSet.size > 0) {
    // First try exact case-insensitive match
    for (const canonical of allowedSet) {
      if (canonical.toLowerCase() === normalized.toLowerCase()) {
        return canonical;
      }
    }

    // Then try partial matches for single words (e.g., "api" in "web api development" should match "API")
    // Check if any word in the normalized string matches a single-word item in allowedSet
    const normalizedWords = normalized.split(' ');
    for (const word of normalizedWords) {
      for (const canonical of allowedSet) {
        if (canonical.split(' ').length === 1 && canonical.toLowerCase() === word.toLowerCase()) {
          return canonical;
        }
      }
    }

    // Finally, try prefix matches (e.g., "Machine Learning Algorithms" should match "Machine Learning")
    // Check if any prefix of the normalized string matches an item in allowedSet
    for (const canonical of allowedSet) {
      if (normalized.toLowerCase().startsWith(canonical.toLowerCase() + ' ') ||
          normalized.toLowerCase() === canonical.toLowerCase()) {
        return canonical;
      }
    }
  }

  // If not in allowedSet → return null (caller will decide Unclassified low-confidence)
  // But first check if the normalized version is in allowedSet (exact match)
  return allowedSet && allowedSet.has(normalized) ? normalized : null;
}

module.exports = { normalizeLabel };
