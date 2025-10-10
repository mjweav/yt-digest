/**
 * Unit tests for ID-based choice contract
 * Tests the validateChoice function and ID mapping
 */
import { validateChoice } from '../lib/validateChoice.js';
import { loadChoices, createIdToLabelMap } from '../lib/choices.js';
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
  console.log('🧪 Running choiceContract tests...\n');

  let passed = 0;
  let total = 0;

  // Test 1: Valid JSON with correct choice_id
  total++; passed += test('valid JSON with correct choice_id', () => {
    const allowedIds = ['technology', 'music', 'news', 'gaming'];

    const result = validateChoice('{"choice_id":"technology","confidence":0.91}', allowedIds);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.choice_id, 'technology');
    assert.strictEqual(result.confidence, 0.91);
  });

  // Test 2: Valid JSON with unknown choice_id
  total++; passed += test('valid JSON with unknown choice_id', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('{"choice_id":"invalid","confidence":0.8}', allowedIds);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'unknown_choice_id');
    assert.strictEqual(result.choice_id, 'invalid');
  });

  // Test 3: Invalid JSON
  total++; passed += test('invalid JSON', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('not valid json', allowedIds);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'invalid_json');
  });

  // Test 4: Valid JSON but not an object
  total++; passed += test('valid JSON but not an object', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('"just a string"', allowedIds);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'not_object');
  });

  // Test 5: Missing choice_id field
  total++; passed += test('missing choice_id field', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('{"confidence":0.8}', allowedIds);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'missing_choice_id');
  });

  // Test 6: Non-string choice_id
  total++; passed += test('non-string choice_id', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('{"choice_id":123,"confidence":0.8}', allowedIds);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'missing_choice_id');
  });

  // Test 7: Valid confidence handling
  total++; passed += test('valid confidence handling', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result1 = validateChoice('{"choice_id":"music","confidence":0.5}', allowedIds);
    assert.strictEqual(result1.confidence, 0.5);

    const result2 = validateChoice('{"choice_id":"news","confidence":1.0}', allowedIds);
    assert.strictEqual(result2.confidence, 1.0);

    const result3 = validateChoice('{"choice_id":"technology","confidence":0}', allowedIds);
    assert.strictEqual(result3.confidence, 0);
  });

  // Test 8: Invalid confidence handling (NaN, out of range)
  total++; passed += test('invalid confidence handling', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result1 = validateChoice('{"choice_id":"music","confidence":"not-a-number"}', allowedIds);
    assert.strictEqual(result1.confidence, null);

    const result2 = validateChoice('{"choice_id":"news","confidence":-0.1}', allowedIds);
    assert.strictEqual(result2.confidence, null);

    const result3 = validateChoice('{"choice_id":"technology","confidence":1.5}', allowedIds);
    assert.strictEqual(result3.confidence, null);
  });

  // Test 9: Missing confidence field
  total++; passed += test('missing confidence field', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('{"choice_id":"music"}', allowedIds);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.choice_id, 'music');
    assert.strictEqual(result.confidence, null);
  });

  // Test 10: Unclassified choice_id
  total++; passed += test('unclassified choice_id', () => {
    const allowedIds = ['technology', 'music', 'news', 'unclassified'];

    const result = validateChoice('{"choice_id":"unclassified","confidence":0.6}', allowedIds);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.choice_id, 'unclassified');
    assert.strictEqual(result.confidence, 0.6);
  });

  // Test 11: Load choices from labelbook
  total++; passed += test('load choices from labelbook', () => {
    const choices = loadChoices();

    assert(Array.isArray(choices), 'Should return an array');
    assert(choices.length > 0, 'Should have at least one choice');

    // Check structure of first choice
    const firstChoice = choices[0];
    assert(firstChoice.id, 'Should have id field');
    assert(firstChoice.label, 'Should have label field');
    assert(firstChoice.desc, 'Should have desc field');
    assert(Array.isArray(firstChoice.anchors), 'Should have anchors array');

    // Check that all choices have valid IDs
    for (const choice of choices) {
      assert(typeof choice.id === 'string', 'ID should be string');
      assert(choice.id.length > 0, 'ID should not be empty');
      assert(/^[a-z-]+$/ .test(choice.id), 'ID should be kebab-case');
    }
  });

  // Test 12: ID to label mapping
  total++; passed += test('ID to label mapping', () => {
    const idToLabelMap = createIdToLabelMap();

    assert(typeof idToLabelMap === 'object', 'Should return an object');
    assert(Object.keys(idToLabelMap).length > 0, 'Should have at least one mapping');

    // Test that we can map an ID to its label
    const choices = loadChoices();
    if (choices.length > 0) {
      const firstChoice = choices[0];
      assert.strictEqual(idToLabelMap[firstChoice.id], firstChoice.label);
    }
  });

  // Test 13: Migration safety - string input should fail
  total++; passed += test('migration safety - string input should fail', () => {
    const allowedIds = ['technology', 'music', 'news'];

    const result = validateChoice('"Technology — software, hardware, AI"', allowedIds);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'not_object');
  });

  // Summary
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  if (passed === total) {
    console.log('🎉 All choiceContract tests passed!');
    process.exit(0);
  } else {
    console.error('💥 Some choiceContract tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
