/**
 * Unit tests for minimal sanitizer (dash normalization only)
 * Tests the normalizeDashes function
 */
import { normalizeDashes } from '../lib/labelSanitizer.js';
import assert from 'assert';

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
  console.log('🧪 Running sanitizerMinimal tests...\n');

  let passed = 0;
  let total = 0;

  // Test 1: Basic dash normalization
  total++; passed += test('basic dash normalization', () => {
    assert.strictEqual(normalizeDashes('‚Äî'), '—');
    assert.strictEqual(normalizeDashes('â€”'), '—');
    assert.strictEqual(normalizeDashes('â€“'), '–');
    assert.strictEqual(normalizeDashes('â€•'), '—');
  });

  // Test 2: Multiple dash types in one string
  total++; passed += test('multiple dash types in one string', () => {
    const input = 'Text ‚Äî more â€“ text â€• end';
    const expected = 'Text — more – text — end';
    assert.strictEqual(normalizeDashes(input), expected);
  });

  // Test 3: Mixed with regular dashes
  total++; passed += test('mixed with regular dashes', () => {
    const input = 'Normal - ‚Äî em â€“ dash â€• here';
    const expected = 'Normal - — em – dash — here';
    assert.strictEqual(normalizeDashes(input), expected);
  });

  // Test 4: No dashes to normalize
  total++; passed += test('no dashes to normalize', () => {
    assert.strictEqual(normalizeDashes('Regular text'), 'Regular text');
    assert.strictEqual(normalizeDashes('No-dashes-here'), 'No-dashes-here');
    assert.strictEqual(normalizeDashes('Multiple   spaces'), 'Multiple   spaces');
  });

  // Test 5: Empty and null inputs
  total++; passed += test('empty and null inputs', () => {
    assert.strictEqual(normalizeDashes(''), '');
    assert.strictEqual(normalizeDashes(null), '');
    assert.strictEqual(normalizeDashes(undefined), '');
  });

  // Test 6: Complex mojibake combinations
  total++; passed += test('complex mojibake combinations', () => {
    const input = 'Tech ‚Äî software â€• hardware â€“ computing';
    const expected = 'Tech — software — hardware – computing';
    assert.strictEqual(normalizeDashes(input), expected);
  });

  // Test 7: Preserve other Unicode characters
  total++; passed += test('preserve other Unicode characters', () => {
    const input = 'Café résumé naïve — em dash ‚Äî';
    const expected = 'Café résumé naïve — em dash —';
    assert.strictEqual(normalizeDashes(input), expected);
  });

  // Test 8: Numbers and special characters
  total++; passed += test('numbers and special characters', () => {
    const input = '2023 ‚Äî 2024 â€“ report â€•';
    const expected = '2023 — 2024 – report —';
    assert.strictEqual(normalizeDashes(input), expected);
  });

  // Summary
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  if (passed === total) {
    console.log('🎉 All sanitizerMinimal tests passed!');
    process.exit(0);
  } else {
    console.error('💥 Some sanitizerMinimal tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
