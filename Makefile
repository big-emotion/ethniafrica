.PHONY: unit-tests integration-tests api-tests all-tests test format format-check lint type-check check e2e e2e-ui e2e-install

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

# Run all checks (lint + type-check + format + tests).
# IMPORTANT: `check` must stay under 5 min wall-clock per NFR (maintainability).
# E2E is intentionally NOT part of `check` — see `make e2e` (ASR-12).
check: lint type-check format-check all-tests
	@echo "✅ All checks passed!"

# Playwright E2E suite (separate from `check` to protect developer feedback loop).
e2e:
	npm run e2e

e2e-ui:
	npm run e2e:ui

e2e-install:
	npm run e2e:install

