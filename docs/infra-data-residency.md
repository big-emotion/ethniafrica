# Data Residency Attestation

**Last verified: 2026-05-13**

This document attests to the geographic region in which each third-party processor
stores and processes data on behalf of the EthniAfrica project. It is the
technical companion to the public privacy policy at [`/fr/confidentialite`](../src/app/[lang]/confidentialite/page.tsx)
and supports the GDPR Article 30 record of processing activities.

Scope: this attestation covers the five processors currently in production.
Any future processor must be added to this matrix before being enabled in
production. Re-verify on every annual privacy review, or whenever a processor's
region configuration changes.

## Processor matrix

| Processor       | Data processed                                                            | Region                              | Verification method                                                                                          | GDPR territorial scope                                  |
| --------------- | ------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Vercel          | Edge / serverless compute, build artifacts, server access logs            | `fra1` (Frankfurt, Germany — EU)    | `vercel.json` `regions: ["fra1"]` and Vercel project → Settings → Functions → Region                         | EU processing; SCCs not required for in-region traffic. |
| Supabase        | PostgreSQL data (AFRIK tables, `user_roles`, auth identities), API access | `eu-central-1` (Frankfurt, Germany) | Supabase project URL hostname matches `*.eu-central-1.supabase.co`; Dashboard → Project Settings → General   | EU processing; no transfer outside EU.                  |
| Upstash Redis   | Rate-limit counters, ephemeral cache (no PII)                             | EU (Frankfurt primary, Ireland HA)  | Upstash Console → Database → Region; database endpoint includes `eu-west-1` / `eu-central-1` host suffix     | EU processing; SCCs not required for in-region traffic. |
| Sentry          | Error events, stack traces, request context (with consent)                | EU data region (`*.de.sentry.io`)   | Sentry Organization → Settings → General → "Data Storage Location" set to **European Union**; DSN host `*.de.sentry.io` | EU processing; data stored in Germany.                  |
| Plausible       | Aggregated pageview events (no personal data, no cookies)                 | EU Cloud — Germany                  | Plausible operates from Germany only (per [Plausible Data Policy](https://plausible.io/data-policy)); script served from `plausible.io` | EU processing; GDPR-compliant by design.                |

All processors are bound by a Data Processing Agreement (DPA). No personal data
is transferred outside the European Economic Area in normal operation.

## How to re-verify

Run this checklist on the annual privacy review (or after any infrastructure
change). Each step must produce a screenshot or command output attached to the
review record.

- [ ] **Vercel** — open the project in the Vercel dashboard, confirm
      `Settings → Functions → Region` is `Frankfurt, Germany (fra1)`. Confirm
      `vercel.json` in the repo root sets `"regions": ["fra1"]`. If
      `vercel.json` is absent, treat this as a finding and create one.
- [ ] **Supabase** — open the Supabase project, confirm
      `Project Settings → General → Region` is `eu-central-1`. Verify the
      `NEXT_PUBLIC_SUPABASE_URL` env value resolves to a host ending in
      `.eu-central-1.supabase.co`.
- [ ] **Upstash Redis** — open the Upstash console, confirm the database
      region is in the EU (Frankfurt or Ireland). Verify the connection URL
      host suffix matches `eu-central-1` or `eu-west-1`.
- [ ] **Sentry** — open the Sentry organization, confirm
      `Settings → General → Data Storage Location` is `European Union`.
      Verify the DSN configured in the app uses a `*.de.sentry.io` ingest host.
- [ ] **Plausible** — confirm the Plausible site is hosted on `plausible.io`
      (EU Cloud) and not a self-hosted or US-region instance. Re-read the
      Plausible Data Policy for any region change.

If any item fails, open a ticket tagged `data-residency` and block any
deployment until the region drift is remediated.

## TODO — pending configuration

- **`vercel.json` is not present in the repo at the time of this attestation.**
  The intended configuration is:

  ```json
  {
    "regions": ["fra1"]
  }
  ```

  Add this file before production rollout so the region pin is enforced via
  Infrastructure-as-Code, not just dashboard configuration. Until then, the
  Vercel region is verified only via the dashboard.

## References

- Functional requirements FR26–FR46 (privacy, consent, data minimization)
- AR37 — Acceptance requirement: data residency must be documented and
  verifiable for every processor
- Public privacy policy: [`/fr/confidentialite`](../src/app/[lang]/confidentialite/page.tsx)
- GDPR Articles 28 (processor obligations), 30 (records of processing), 44–49
  (international transfers)
