.PHONY: unit-tests integration-tests api-tests all-tests test format format-check lint type-check check e2e e2e-ui e2e-install social-tools social-engine

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

# Social render engine (social/). Two runners, and only one of them is cheap.
#
# The Node tools need nothing but node, so they join `check`. The Python engine
# needs its own virtualenv and, for six of its ten suites, the production corpus
# — neither of which exists on a CI runner, and both of which would push `check`
# past its five-minute budget. It is a separate target, run before touching the
# engine and before a render.
social-tools:
	npm run test:social-tools

social-engine:
	npm run test:social-engine

# Run all checks (lint + type-check + format + tests).
# IMPORTANT: `check` must stay under 5 min wall-clock per NFR (maintainability).
# E2E is intentionally NOT part of `check` — see `make e2e` (ASR-12).
check: lint type-check format-check all-tests social-tools
	@echo "✅ All checks passed!"

# Playwright E2E suite (separate from `check` to protect developer feedback loop).
e2e:
	npm run e2e

e2e-ui:
	npm run e2e:ui

e2e-install:
	npm run e2e:install

