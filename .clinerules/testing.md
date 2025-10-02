# Testing Rules

**Test Organization**
- All validation and integration tests must be placed in `/tests/` folder
- Test files should follow naming convention: `test-[feature]-[type].js`
- Test report files should follow naming convention: `[feature]-[type]-report.json`
- Tests should be runnable with `node [test-file]` from project root

**Test Categories**
- **Validation Tests**: Test code structure, patterns, and implementation correctness
- **Integration Tests**: Test real-world scenarios and user workflows
- **Unit Tests**: Test individual functions and components (future)

**Test Requirements**
- All tests must include comprehensive error handling
- Tests should generate JSON reports in `/tests/` folder
- Tests should exit with proper status codes (0 for success, 1 for failure)
- Tests should include timestamps and detailed logging

**Running Tests**
- Use `npm test` script when available (future enhancement)
- Individual tests can be run with `node tests/[test-file]`
- All tests should be runnable in CI/CD environment

**Test Documentation**
- Each test file should include JSDoc comments explaining purpose
- Test reports should be human-readable and include pass/fail summaries
- Failed tests should provide clear error messages for debugging
