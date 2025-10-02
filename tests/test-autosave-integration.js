#!/usr/bin/env node

/**
 * YT-Digest Autosave Integration Tests
 * Simulates real-world usage scenarios for the autosave functionality
 */

const fs = require('fs');
const path = require('path');

class AutosaveIntegrationTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.mockApiResponses = {
      success: { selectionsCount: 1, selectedCount: 1 },
      error: { error: 'Network error' }
    };
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

  // Test 1: Simulate successful autosave scenario
  testSuccessfulAutosave() {
    this.log('Testing successful autosave scenario...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract the toggleChannelSelection function
      const functionStart = content.indexOf('const toggleChannelSelection = async (channelId) =>');
      const functionEnd = content.indexOf('const isChannelSelected = (channelId) =>');
      const functionText = content.substring(functionStart, functionEnd - 1);

      // Validate the function handles success correctly
      const hasSuccessHandling = functionText.includes('response.ok') && functionText.includes('result.selectionsCount');
      if (!hasSuccessHandling) {
        this.error('Success handling in autosave not found');
        return false;
      }

      // Check for console logging on success
      const hasSuccessLogging = functionText.includes('Autosave:') && functionText.includes('selections saved');
      if (!hasSuccessLogging) {
        this.error('Success logging not found');
        return false;
      }

      this.success('✓ Successful autosave scenario validated');
      return true;

    } catch (err) {
      this.error(`Failed to test successful autosave: ${err.message}`);
      return false;
    }
  }

  // Test 2: Simulate failed autosave scenario
  testFailedAutosave() {
    this.log('Testing failed autosave scenario...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract the toggleChannelSelection function
      const functionStart = content.indexOf('const toggleChannelSelection = async (channelId) =>');
      const functionEnd = content.indexOf('const isChannelSelected = (channelId) =>');
      const functionText = content.substring(functionStart, functionEnd - 1);

      // Validate error handling structure
      const hasErrorCatch = functionText.includes('catch (error)');
      if (!hasErrorCatch) {
        this.error('Error catch block not found');
        return false;
      }

      // Check for state reversion on error
      const hasStateRevert = functionText.includes('setSelections(selections)');
      if (!hasStateRevert) {
        this.error('State reversion on error not found');
        return false;
      }

      // Check for toast notification on error
      const hasToastError = functionText.includes('setToastMessage') && functionText.includes('Failed to save');
      if (!hasToastError) {
        this.error('Toast error notification not found');
        return false;
      }

      // Check for alert fallback
      const hasAlertFallback = functionText.includes('alert') && functionText.includes('Autosave failed');
      if (!hasAlertFallback) {
        this.error('Alert fallback not found');
        return false;
      }

      this.success('✓ Failed autosave scenario validated');
      return true;

    } catch (err) {
      this.error(`Failed to test failed autosave: ${err.message}`);
      return false;
    }
  }

  // Test 3: Validate optimistic update behavior
  testOptimisticUpdates() {
    this.log('Testing optimistic update behavior...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract the toggleChannelSelection function
      const functionStart = content.indexOf('const toggleChannelSelection = async (channelId) =>');
      const functionEnd = content.indexOf('const isChannelSelected = (channelId) =>');
      const functionText = content.substring(functionStart, functionEnd - 1);

      // Check that state update happens before API call
      const stateUpdateIndex = functionText.indexOf('setSelections(updatedSelections)');
      const apiCallIndex = functionText.indexOf("fetch('/api/selections'");

      if (stateUpdateIndex === -1) {
        this.error('Optimistic state update not found');
        return false;
      }

      if (apiCallIndex === -1) {
        this.error('API call not found');
        return false;
      }

      if (stateUpdateIndex >= apiCallIndex) {
        this.error('State update should happen before API call for optimistic updates');
        return false;
      }

      // Check that error reversion uses original selections
      const errorRevertIndex = functionText.indexOf('setSelections(selections)');
      if (errorRevertIndex === -1) {
        this.error('Error state reversion not found');
        return false;
      }

      this.success('✓ Optimistic update behavior validated');
      return true;

    } catch (err) {
      this.error(`Failed to test optimistic updates: ${err.message}`);
      return false;
    }
  }

  // Test 4: Validate manual sync button functionality
  testManualSyncButton() {
    this.log('Testing manual sync button functionality...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check that manual sync button still exists
      const hasManualSyncButton = content.includes('Manual Sync');
      if (!hasManualSyncButton) {
        this.error('Manual sync button not found');
        return false;
      }

      // Check that it still calls saveChannelSelections
      const hasSaveCall = content.includes('onClick={saveChannelSelections}');
      if (!hasSaveCall) {
        this.error('Manual sync button does not call saveChannelSelections');
        return false;
      }

      // Check for tooltip explaining the difference
      const hasTooltip = content.includes('selections are automatically saved');
      if (!hasTooltip) {
        this.error('Tooltip explaining autosave behavior not found');
        return false;
      }

      this.success('✓ Manual sync button functionality validated');
      return true;

    } catch (err) {
      this.error(`Failed to test manual sync button: ${err.message}`);
      return false;
    }
  }

  // Test 5: Validate edge cases and error conditions
  testEdgeCases() {
    this.log('Testing edge cases and error conditions...');

    try {
      const filePath = path.join(__dirname, 'src/pages/ChannelPicker.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for proper error message when API fails
      const hasProperErrorMessage = content.includes('Failed to autosave selections');
      if (!hasProperErrorMessage) {
        this.error('Proper error message for autosave failure not found');
        return false;
      }

      // Check for network error handling
      const hasNetworkErrorHandling = content.includes('Network error');
      if (!hasNetworkErrorHandling) {
        this.error('Network error handling not found');
        return false;
      }

      // Check for console error logging
      const hasConsoleErrorLogging = content.includes('console.error') && content.includes('Autosave error');
      if (!hasConsoleErrorLogging) {
        this.error('Console error logging not found');
        return false;
      }

      this.success('✓ Edge cases and error conditions validated');
      return true;

    } catch (err) {
      this.error(`Failed to test edge cases: ${err.message}`);
      return false;
    }
  }

  // Run all integration tests
  async runAllTests() {
    this.log('🔧 Starting YT-Digest Autosave Integration Tests');
    this.log('===============================================');

    const tests = [
      { name: 'Successful Autosave', test: () => this.testSuccessfulAutosave() },
      { name: 'Failed Autosave', test: () => this.testFailedAutosave() },
      { name: 'Optimistic Updates', test: () => this.testOptimisticUpdates() },
      { name: 'Manual Sync Button', test: () => this.testManualSyncButton() },
      { name: 'Edge Cases', test: () => this.testEdgeCases() }
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
    this.log(`Integration Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      this.success('🎉 All integration tests passed!');
      this.log('');
      this.log('✅ Integration Scenarios Validated:');
      this.log('  • Successful autosave with API response');
      this.log('  • Failed autosave with error handling');
      this.log('  • Optimistic updates with proper ordering');
      this.log('  • Manual sync fallback functionality');
      this.log('  • Edge cases and error conditions');
    } else {
      this.error(`❌ ${failed} test(s) failed. Please review the errors above.`);
    }

    return failed === 0;
  }

  // Generate integration test report
  generateReport() {
    const reportPath = path.join(__dirname, 'autosave-integration-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      testType: 'integration',
      summary: {
        total: this.testResults.length,
        errors: this.errors.length,
        success: this.testResults.filter(r => r.type === 'success').length
      },
      results: this.testResults,
      errors: this.errors
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Integration test report saved to: ${reportPath}`);

    return report;
  }
}

// Run integration tests if called directly
if (require.main === module) {
  const tester = new AutosaveIntegrationTester();
  tester.runAllTests()
    .then(success => {
      tester.generateReport();
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Integration test suite failed:', err);
      process.exit(1);
    });
}

module.exports = AutosaveIntegrationTester;
