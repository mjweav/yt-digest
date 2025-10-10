/**
 * Unit tests for labelSanitizer.js
 * Tests the normalizeLabel function with various edge cases
 */
const { normalizeLabel } = require('../lib/labelSanitizer.js');
const assert = require('assert');

// Test helper to run assertions and report results
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

// Main test runner
function runTests() {
  console.log('🧪 Running labelSanitizer tests...\n');

  let passed = 0;
  let total = 0;

  // Test 1: Echoed verbose strings → canonical
  total++; passed += test('verbose strings to canonical', () => {
    const allowedSet = new Set(['Technology', 'Business', 'Music', 'News']);

    assert.strictEqual(normalizeLabel('Technology — software, hardware, AI, computing, and devices.', allowedSet), 'Technology');
    assert.strictEqual(normalizeLabel('Business — entrepreneurship, marketing, and business strategies.', allowedSet), 'Business');
    assert.strictEqual(normalizeLabel('Music — music performance, lessons, production.', allowedSet), 'Music');
    assert.strictEqual(normalizeLabel('News — journalism, reporting, and current events.', allowedSet), 'News');
  });

  // Test 2: Mojibake dash variants
  total++; passed += test('mojibake dash variants', () => {
    const allowedSet = new Set(['Finance', 'News', 'Photography', 'Technology']);

    assert.strictEqual(normalizeLabel('Finance ‚Äî personal finance...', allowedSet), 'Finance');
    assert.strictEqual(normalizeLabel('News â€” journalism...', allowedSet), 'News');
    assert.strictEqual(normalizeLabel('Photography â€“ gear...', allowedSet), 'Photography');
    assert.strictEqual(normalizeLabel('Technology â€• advanced tech...', allowedSet), 'Technology');
  });

  // Test 3: Stripping after separators
  total++; passed += test('stripping after separators', () => {
    const allowedSet = new Set(['Automotive', 'History', 'Science', 'Art']);

    assert.strictEqual(normalizeLabel('Automotive: cars, motorcycles', allowedSet), 'Automotive');
    assert.strictEqual(normalizeLabel('History · analysis', allowedSet), 'History');
    assert.strictEqual(normalizeLabel('Science—research and discovery', allowedSet), 'Science');
    assert.strictEqual(normalizeLabel('Art–creativity and expression', allowedSet), 'Art');
  });

  // Test 4: Word cap (3 words max)
  total++; passed += test('word cap to 3 words', () => {
    const allowedSet = new Set(['Tech Tutorials General', 'Deep Learning Research', 'Machine Learning', 'Web Development']);

    const result1 = normalizeLabel('Tech Tutorials General Programming', allowedSet);
    console.log('Test 4.1:', 'Tech Tutorials General Programming', '->', result1, 'allowedSet:', [...allowedSet]);
    assert.strictEqual(result1, 'Tech Tutorials General');

    const result2 = normalizeLabel('Deep Learning Research Topics In AI', allowedSet);
    console.log('Test 4.2:', 'Deep Learning Research Topics In AI', '->', result2);
    assert.strictEqual(result2, 'Deep Learning Research');

    assert.strictEqual(normalizeLabel('Machine Learning Algorithms And Models', allowedSet), 'Machine Learning');
    assert.strictEqual(normalizeLabel('Web Development Frontend Backend', allowedSet), 'Web Development');
  });

  // Test 5: Case reconciliation vs allowedSet
  total++; passed += test('case reconciliation with allowedSet', () => {
    const allowedSet = new Set(['AI', 'News', 'Technology', 'Machine Learning']);

    assert.strictEqual(normalizeLabel('technology', allowedSet), 'Technology');
    assert.strictEqual(normalizeLabel('ai', allowedSet), 'AI');
    assert.strictEqual(normalizeLabel('NEWS', allowedSet), 'News');
    assert.strictEqual(normalizeLabel('machine learning', allowedSet), 'Machine Learning');
  });

  // Test 6: Acronym preservation
  total++; passed += test('acronym preservation', () => {
    const allowedSet = new Set(['AI', 'HTML', 'CSS', 'SQL', 'API', 'Technology']);

    assert.strictEqual(normalizeLabel('ai technology', allowedSet), 'AI');
    assert.strictEqual(normalizeLabel('html and css', allowedSet), 'HTML');
    assert.strictEqual(normalizeLabel('sql database', allowedSet), 'SQL');
  });

  // Test 7: Ampersand handling
  total++; passed += test('ampersand handling', () => {
    const allowedSet = new Set(['R&D', 'Research & Development', 'Technology']);

    assert.strictEqual(normalizeLabel('r&d projects', allowedSet), 'R&D');
    assert.strictEqual(normalizeLabel('research & development', allowedSet), 'Research & Development');
  });

  // Test 8: Null/empty input handling
  total++; passed += test('null/empty input handling', () => {
    const allowedSet = new Set(['Technology', 'News']);

    assert.strictEqual(normalizeLabel(null, allowedSet), null);
    assert.strictEqual(normalizeLabel(undefined, allowedSet), null);
    assert.strictEqual(normalizeLabel('', allowedSet), null);
    assert.strictEqual(normalizeLabel('   ', allowedSet), null);
  });

  // Test 9: Not in allowedSet returns null
  total++; passed += test('not in allowedSet returns null', () => {
    const allowedSet = new Set(['Technology', 'News', 'Sports']);

    assert.strictEqual(normalizeLabel('Invalid Category', allowedSet), null);
    assert.strictEqual(normalizeLabel('Some Random Label', allowedSet), null);
    assert.strictEqual(normalizeLabel('Entertainment', allowedSet), null);
  });

  // Test 10: Complex mojibake and separator combinations
  total++; passed += test('complex mojibake and separator combinations', () => {
    const allowedSet = new Set(['Technology', 'Business', 'Finance']);

    assert.strictEqual(normalizeLabel('Technology ‚Äî software â€• hardware: computing', allowedSet), 'Technology');
    assert.strictEqual(normalizeLabel('Businessâ€“entrepreneurship · marketing', allowedSet), 'Business');
    assert.strictEqual(normalizeLabel('Finance ‚Äî personal finance and investment', allowedSet), 'Finance');
  });

  // Test 11: Edge case - exactly 3 words
  total++; passed += test('exactly 3 words', () => {
    const allowedSet = new Set(['Machine Learning Models', 'Deep Learning Research', 'Computer Science']);

    assert.strictEqual(normalizeLabel('Machine Learning Models', allowedSet), 'Machine Learning Models');
    assert.strictEqual(normalizeLabel('Deep Learning Research', allowedSet), 'Deep Learning Research');
  });

  // Test 12: Mixed case with acronyms
  total++; passed += test('mixed case with acronyms', () => {
    const allowedSet = new Set(['AI', 'ML', 'API', 'Web Development']);

    assert.strictEqual(normalizeLabel('ai and ml', allowedSet), 'AI');
    assert.strictEqual(normalizeLabel('web api development', allowedSet), 'API');
  });

  // Summary
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.error('💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
