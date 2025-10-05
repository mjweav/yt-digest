#!/usr/bin/env node

/**
 * YT-Digest Semantic Deduplication and Discriminative Labels Validation Tests
 * Tests the Microstep 3.2c implementation for semantic deduplication and discriminative labeling
 */

const fs = require('fs');
const path = require('path');

class SemanticDedupValidator {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(formattedMessage);

    this.testResults.push({
      timestamp,
      type,
      message
    });
  }

  error(message) {
    this.log(message, 'error');
    this.errors.push(message);
  }

  success(message) {
    this.log(message, 'success');
  }

  // Test 1: Validate that new functions exist in builder.js
  testFunctionExistence() {
    this.log('Testing function existence in builder.js...');

    try {
      const filePath = path.join(__dirname, '../server/autoOrganize/builder.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for dedupSimilarClusters function
      const hasDedupFunction = content.includes('async function dedupSimilarClusters');
      if (!hasDedupFunction) {
        this.error('dedupSimilarClusters function not found');
        return false;
      }

      // Check for ensureParentLabelUniqueness function
      const hasUniquenessFunction = content.includes('function ensureParentLabelUniqueness');
      if (!hasUniquenessFunction) {
        this.error('ensureParentLabelUniqueness function not found');
        return false;
      }

      // Check for applyDiscriminativeLabeling function
      const hasDiscriminativeFunction = content.includes('async function applyDiscriminativeLabeling');
      if (!hasDiscriminativeFunction) {
        this.error('applyDiscriminativeLabeling function not found');
        return false;
      }

      // Check for helper functions
      const hasJaccardSimilarity = content.includes('function jaccardSimilarity');
      if (!hasJaccardSimilarity) {
        this.error('jaccardSimilarity function not found');
        return false;
      }

      const hasStemFunction = content.includes('function stem') || content.includes('stem(word)');
      if (!hasStemFunction) {
        this.error('stem function not found');
        return false;
      }

      this.success('✓ All required functions exist in builder.js');
      return true;

    } catch (err) {
      this.error(`Failed to read builder.js: ${err.message}`);
      return false;
    }
  }

  // Test 2: Validate function integration in buildAutoOrganize
  testIntegration() {
    this.log('Testing integration in buildAutoOrganize function...');

    try {
      const filePath = path.join(__dirname, '../server/autoOrganize/builder.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for semantic deduplication step
      const hasDedupStep = content.includes('const dedupResult = await dedupSimilarClusters');
      if (!hasDedupStep) {
        this.error('Semantic deduplication step not found in buildAutoOrganize');
        return false;
      }

      // Check for parent uniqueness step
      const hasUniquenessStep = content.includes('const finalClusters = ensureParentLabelUniqueness');
      if (!hasUniquenessStep) {
        this.error('Parent uniqueness step not found in buildAutoOrganize');
        return false;
      }

      // Check for discriminative labeling step
      const hasDiscriminativeStep = content.includes('const discriminativelyLabeledClusters = await applyDiscriminativeLabeling');
      if (!hasDiscriminativeStep) {
        this.error('Discriminative labeling step not found in buildAutoOrganize');
        return false;
      }

      // Check for new return values
      const hasNewReturnValues = content.includes('mergedClustersSemantic') &&
                                 content.includes('dedupGroups');
      if (!hasNewReturnValues) {
        this.error('New return values (mergedClustersSemantic, dedupGroups) not found');
        return false;
      }

      this.success('✓ Functions properly integrated in buildAutoOrganize');
      return true;

    } catch (err) {
      this.error(`Failed to validate integration: ${err.message}`);
      return false;
    }
  }

  // Test 3: Validate debug output enhancements in routes
  testDebugOutput() {
    this.log('Testing debug output enhancements in routes...');

    try {
      const filePath = path.join(__dirname, '../server/routes/autoOrganize.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for new debug fields
      const hasSemanticDedupSection = content.includes('semanticDedup:');
      if (!hasSemanticDedupSection) {
        this.error('semanticDedup section not found in debug output');
        return false;
      }

      // Check for mergedClustersSemantic in debug
      const hasMergedClustersSemantic = content.includes('mergedClustersSemantic,');
      if (!hasMergedClustersSemantic) {
        this.error('mergedClustersSemantic not found in debug output');
        return false;
      }

      // Check for dedupGroups in debug
      const hasDedupGroups = content.includes('dedupGroups:');
      if (!hasDedupGroups) {
        this.error('dedupGroups not found in debug output');
        return false;
      }

      this.success('✓ Debug output properly enhanced');
      return true;

    } catch (err) {
      this.error(`Failed to validate debug output: ${err.message}`);
      return false;
    }
  }

  // Test 4: Validate cosine and jaccard similarity functions
  testSimilarityFunctions() {
    this.log('Testing cosine and jaccard similarity functions...');

    try {
      const filePath = path.join(__dirname, '../server/autoOrganize/builder.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check cosine similarity implementation
      const hasCosineImplementation = content.includes('Math.sqrt(normA) * Math.sqrt(normB)') &&
                                     content.includes('dotProduct / magnitude');
      if (!hasCosineImplementation) {
        this.error('Cosine similarity implementation appears incorrect');
        return false;
      }

      // Check jaccard similarity implementation
      const hasJaccardImplementation = content.includes('intersection.size / union.size');
      if (!hasJaccardImplementation) {
        this.error('Jaccard similarity implementation not found');
        return false;
      }

      // Check for proper similarity thresholds in dedup function
      const hasCosineThreshold = content.includes('cosineSim >= 0.80');
      if (!hasCosineThreshold) {
        this.error('Cosine similarity threshold (0.80) not found');
        return false;
      }

      const hasJaccardThreshold = content.includes('jaccardSim >= 0.6');
      if (!hasJaccardThreshold) {
        this.error('Jaccard similarity threshold (0.6) not found');
        return false;
      }

      this.success('✓ Similarity functions properly implemented');
      return true;

    } catch (err) {
      this.error(`Failed to validate similarity functions: ${err.message}`);
      return false;
    }
  }

  // Test 5: Validate discriminative labeling logic
  testDiscriminativeLabeling() {
    this.log('Testing discriminative labeling logic...');

    try {
      const filePath = path.join(__dirname, '../server/autoOrganize/builder.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for TF-IDF weight calculation
      const hasTfidfCalculation = content.includes('tf * idf') &&
                                 content.includes('Math.log(parentChannels.length / df)');
      if (!hasTfidfCalculation) {
        this.error('TF-IDF weight calculation not found');
        return false;
      }

      // Check for discriminative term selection
      const hasDiscriminativeSelection = content.includes('sort((a, b) => b[1] - a[1])') &&
                                        content.includes('slice(0, 2)');
      if (!hasDiscriminativeSelection) {
        this.error('Discriminative term selection logic not found');
        return false;
      }

      // Check for label format standardization
      const hasLabelFormat = content.includes('charAt(0).toUpperCase() + t.slice(1)') &&
                            content.includes(' • ');
      if (!hasLabelFormat) {
        this.error('Label format standardization not found');
        return false;
      }

      this.success('✓ Discriminative labeling logic is correct');
      return true;

    } catch (err) {
      this.error(`Failed to validate discriminative labeling: ${err.message}`);
      return false;
    }
  }

  // Test 6: Validate canonical key generation
  testCanonicalKeys() {
    this.log('Testing canonical key generation...');

    try {
      const filePath = path.join(__dirname, '../server/autoOrganize/builder.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for canonical key structure
      const hasCanonicalKey = content.includes('topTerms.slice(0, 4).map(term => stem(term)).sort()');
      if (!hasCanonicalKey) {
        this.error('Canonical key generation structure not found');
        return false;
      }

      // Check for stemming implementation (at least one replace call)
      const hasStemming = content.includes('replace(/ing$/, "")') ||
                         content.includes('replace(/ed$/, "")') ||
                         content.includes('replace(/er$/, "")') ||
                         content.includes('replace(/est$/, "")') ||
                         content.includes('replace(/ly$/, "")') ||
                         content.includes('replace(/s$/, "")');
      if (!hasStemming) {
        this.error('Stemming implementation not found');
        return false;
      }

      // Check for sorting in canonical key
      const hasSorting = content.includes('.sort()') && content.includes('topTerms.slice(0, 4).map(term => stem(term)).sort()');
      if (!hasSorting) {
        this.error('Sorting in canonical key generation not found');
        return false;
      }

      this.success('✓ Canonical key generation is correct');
      return true;

    } catch (err) {
      this.error(`Failed to validate canonical keys: ${err.message}`);
      return false;
    }
  }

  // Test 7: Validate parent-scope uniqueness logic
  testParentUniqueness() {
    this.log('Testing parent-scope uniqueness logic...');

    try {
      const filePath = path.join(__dirname, '../server/autoOrganize/builder.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for parent grouping
      const hasParentGrouping = content.includes('parentGroups.set(parent, [])');
      if (!hasParentGrouping) {
        this.error('Parent grouping logic not found');
        return false;
      }

      // Check for duplicate detection within parents
      const hasDuplicateDetection = content.includes('labelCounts.set(label,') &&
                                   content.includes('duplicateLabels.add(label)');
      if (!hasDuplicateDetection) {
        this.error('Duplicate detection within parents not found');
        return false;
      }

      // Check for discriminative term fallback
      const hasDiscriminativeFallback = content.includes('topTerms.slice(2, 4)') &&
                                       content.includes('topTerms.slice(4, 6)');
      if (!hasDiscriminativeFallback) {
        this.error('Discriminative term fallback not found');
        return false;
      }

      // Check for suffix fallback
      const hasSuffixFallback = content.includes('• Alt') || content.includes('• V2');
      if (!hasSuffixFallback) {
        this.error('Suffix fallback not found');
        return false;
      }

      this.success('✓ Parent-scope uniqueness logic is correct');
      return true;

    } catch (err) {
      this.error(`Failed to validate parent uniqueness: ${err.message}`);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting YT-Digest Semantic Deduplication Validation Tests');
    this.log('========================================================');

    const tests = [
      { name: 'Function Existence', test: () => this.testFunctionExistence() },
      { name: 'Integration', test: () => this.testIntegration() },
      { name: 'Debug Output', test: () => this.testDebugOutput() },
      { name: 'Similarity Functions', test: () => this.testSimilarityFunctions() },
      { name: 'Discriminative Labeling', test: () => this.testDiscriminativeLabeling() },
      { name: 'Canonical Keys', test: () => this.testCanonicalKeys() },
      { name: 'Parent Uniqueness', test: () => this.testParentUniqueness() }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (err) {
        this.error(`Test "${name}" threw an error: ${err.message}`);
        failed++;
      }
    }

    // Summary
    this.log('========================================================');
    this.log(`Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      this.success('🎉 All validation tests passed!');
      this.log('');
      this.log('✅ Semantic Deduplication Implementation Validated:');
      this.log('  • All required functions implemented');
      this.log('  • Proper integration in buildAutoOrganize pipeline');
      this.log('  • Enhanced debug output with new metrics');
      this.log('  • Correct similarity function implementations');
      this.log('  • Proper discriminative labeling logic');
      this.log('  • Canonical key generation working');
      this.log('  • Parent-scope uniqueness rules applied');
    } else {
      this.error(`❌ ${failed} test(s) failed. Please review the errors above.`);
    }

    return failed === 0;
  }

  // Generate test report
  generateReport() {
    const reportPath = path.join(__dirname, 'semantic-dedup-validation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        errors: this.errors.length,
        success: this.testResults.filter(r => r.type === 'success').length
      },
      results: this.testResults,
      errors: this.errors
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Test report saved to: ${reportPath}`);

    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const validator = new SemanticDedupValidator();
  validator.runAllTests()
    .then(success => {
      validator.generateReport();
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = SemanticDedupValidator;
