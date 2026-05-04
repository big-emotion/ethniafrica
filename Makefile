.PHONY: unit-tests integration-tests api-tests all-tests test format format-check lint type-check check

# Test commands as specified in TDD plan
unit-tests:
	npm run unit-tests

integration-tests:
	npm run integration-tests

api-tests:
	npm run api-tests

all-tests:
	npm run all-tests

test:
	npm run test

test-watch:
	npm run test:watch

test-ui:
	npm run test:ui

test-coverage:
	npm run test:coverage

# Type checking
type-check:
	npm run type-check

# Linting
lint:
	npm run lint

# Formatting
format:
	npm run format

format-check:
	npm run format:check

# Run all checks (lint + type-check + format + tests)
check: lint type-check format-check all-tests
	@echo "✅ All checks passed!"

