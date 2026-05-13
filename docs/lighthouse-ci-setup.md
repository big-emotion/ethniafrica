# Lighthouse CI Setup

## Overview

The Lighthouse CI gate measures mobile performance on reference routes and enforces:

- **Performance** ≥ 85
- **Accessibility** = 100
- **Best Practices** ≥ 95

## Configuration

The main Lighthouse CI configuration lives in `.lighthouserc.js` at the repository root.

### Reference Routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/fr/pays/senegal` | Sample country fiche |
| `/fr/peuples/wolof` | Sample people fiche |

### Mobile Profile

Emulates Moto G Power on a 4G connection:

- Form factor: mobile (360×640, 2.625× DPI)
- RTT: 150 ms
- Download: 1,638.4 Kbps
- Upload: 750 Kbps
- CPU slowdown: 4×

## GitHub Actions Workflow

The workflow file must be manually added to `.github/workflows/lighthouse.yml`
by a user with `workflows` permission on the GitHub App / token.

The workflow content is maintained in `.lighthouserc.js` (configuration) and
the workflow definition is documented below.

### Manual Installation

```bash
cp docs/lighthouse-workflow.yml .github/workflows/lighthouse.yml
git add .github/workflows/lighthouse.yml
git commit -m "ci(lighthouse): add Lighthouse CI workflow"
git push
```

> **Note:** The GitHub App used by the ferry automation does not have the
> `workflows` scope, so the workflow file cannot be pushed automatically.
> A repository maintainer with the `workflows` scope must push it manually.

## Running Locally

```bash
# Install LHCI CLI
npm install -g @lhci/cli --legacy-peer-deps

# Build and start the app
npm run build
npm run start &

# Wait for server
npx wait-on http://localhost:3000

# Run the audit
lhci autorun
```
