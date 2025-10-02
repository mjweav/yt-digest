#!/usr/bin/env node

/**
 * YT-Digest Autosave Validation Tests
 * Tests the immediate autosave functionality for channel selections
 */

const fs = require('fs');
const path = require('path');

class AutosaveValidator {
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

  // Test 1: Validate that the toggleChannelSelection function exists and is async
  testToggleChannelSelectionFunction() {
    this.log('Testing toggleChannelSelection function structure...');

    try {
      // Read the ChannelPicker.jsx file
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check if function exists and is async
      const hasAsyncFunction = content.includes('const toggleChannelSelection = async (channelId) =>');
      if (!hasAsyncFunction) {
        this.error('toggleChannelSelection function is not async or not found');
        return false;
      }

      // Check for optimistic updates
      const hasOptimisticUpdate = content.includes('setSelections(updatedSelections)');
      if (!hasOptimisticUpdate) {
        this.error('Optimistic UI update not found');
        return false;
      }

      // Check for API call
      const hasApiCall = content.includes("fetch('/api/selections'");
      if (!hasApiCall) {
        this.error('API call for autosave not found');
        return false;
      }

      // Check for error handling
      const hasErrorHandling = content.includes('catch (error)') && content.includes('setSelections(selections)');
      if (!hasErrorHandling) {
        this.error('Error handling with state reversion not found');
        return false;
      }

      this.success('✓ toggleChannelSelection function structure is correct');
      return true;

    } catch (err) {
      this.error(`Failed to read file: ${err.message}`);
      return false;
    }
  }

  // Test 2: Validate error handling patterns
  testErrorHandling() {
    this.log('Testing error handling patterns...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for toast notifications on error
      const hasToastError = content.includes('setToastMessage') && content.includes('Failed to save selection');
      if (!hasToastError) {
        this.error('Toast error notification not found');
        return false;
      }

      // Check for alert fallback
      const hasAlertFallback = content.includes('alert') && content.includes('Autosave failed');
      if (!hasAlertFallback) {
        this.error('Alert fallback for failed autosave not found');
        return false;
      }

      // Check for state reversion on error
      const hasStateReversion = content.includes('setSelections(selections)');
      if (!hasStateReversion) {
        this.error('State reversion on error not found');
        return false;
      }

      this.success('✓ Error handling patterns are correct');
      return true;

    } catch (err) {
      this.error(`Failed to validate error handling: ${err.message}`);
      return false;
    }
  }

  // Test 3: Validate UI button changes
  testButtonChanges() {
    this.log('Testing save button role changes...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for "Manual Sync" text
      const hasManualSync = content.includes('Manual Sync');
      if (!hasManualSync) {
        this.error('Manual Sync button text not found');
        return false;
      }

      // Check for tooltip explaining autosave
      const hasTooltip = content.includes('selections are automatically saved');
      if (!hasTooltip) {
        this.error('Tooltip explaining autosave behavior not found');
        return false;
      }

      // Check for blue/indigo color scheme (from-emerald to-blue)
      const hasBlueColorScheme = content.includes('from-blue-600 to-indigo-700');
      if (!hasBlueColorScheme) {
        this.error('Blue/indigo color scheme for manual sync button not found');
        return false;
      }

      this.success('✓ Save button role changes are correct');
      return true;

    } catch (err) {
      this.error(`Failed to validate button changes: ${err.message}`);
      return false;
    }
  }

  // Test 4: Validate API endpoint structure
  testApiEndpoint() {
    this.log('Testing API endpoint structure...');

    try {
      const filePath = path.join(__dirname, 'server/index.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for POST /api/selections endpoint
      const hasSelectionsEndpoint = content.includes("app.post('/api/selections'");
      if (!hasSelectionsEndpoint) {
        this.error('POST /api/selections endpoint not found');
        return false;
      }

      this.success('✓ API endpoint structure is correct');
      return true;

    } catch (err) {
      this.error(`Failed to read server file: ${err.message}`);
      return false;
    }
  }

  // Test 5: Validate optimistic update logic
  testOptimisticUpdates() {
    this.log('Testing optimistic update logic...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for immediate state update before API call
      const functionText = content.substring(
        content.indexOf('const toggleChannelSelection = async (channelId) =>'),
        content.indexOf('const isChannelSelected = (channelId) =>') - 1
      );

      // Validate order: state update -> API call -> error handling
      const stateUpdateIndex = functionText.indexOf('setSelections(updatedSelections)');
      const apiCallIndex = functionText.indexOf("fetch('/api/selections'");
      const errorRevertIndex = functionText.indexOf('setSelections(selections)');

      if (stateUpdateIndex === -1) {
        this.error('Optimistic state update not found');
        return false;
      }

      if (apiCallIndex === -1) {
        this.error('API call not found');
        return false;
      }

      if (errorRevertIndex === -1) {
        this.error('Error state reversion not found');
        return false;
      }

      // Validate correct order
      if (stateUpdateIndex > apiCallIndex) {
        this.error('State update should happen before API call');
        return false;
      }

      if (errorRevertIndex < apiCallIndex) {
        this.error('Error reversion should happen after API call');
        return false;
      }

      this.success('✓ Optimistic update logic is correct');
      return true;

    } catch (err) {
      this.error(`Failed to validate optimistic updates: ${err.message}`);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting YT-Digest Autosave Validation Tests');
    this.log('===============================================');

    const tests = [
      { name: 'Function Structure', test: () => this.testToggleChannelSelectionFunction() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
      { name: 'Button Changes', test: () => this.testButtonChanges() },
      { name: 'API Endpoint', test: () => this.testApiEndpoint() },
      { name: 'Optimistic Updates', test: () => this.testOptimisticUpdates() }
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
    this.log('===============================================');
    this.log(`Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      this.success('🎉 All validation tests passed!');
      this.log('');
      this.log('✅ Autosave Implementation Validated:');
      this.log('  • Immediate API calls on channel selection');
      this.log('  • Optimistic UI updates with error reversion');
      this.log('  • Comprehensive error handling');
      this.log('  • Updated manual sync button role');
      this.log('  • Proper API endpoint structure');
    } else {
      this.error(`❌ ${failed} test(s) failed. Please review the errors above.`);
    }

    return failed === 0;
  }

  // Generate test report
  generateReport() {
    const reportPath = path.join(__dirname, 'autosave-validation-report.json');
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
  const validator = new AutosaveValidator();
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

module.exports = AutosaveValidator;
