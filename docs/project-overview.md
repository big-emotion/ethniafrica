# Project Overview — EthniAfrica

**Generated:** 2026-04-13 · **Scan level:** deep · **Repository type:** monolith (single part)

## Purpose

EthniAfrica is a Next.js web application providing comprehensive data on African peoples, languages, linguistic families, and countries. It applies the **AFRIK methodology** — a decolonial, source-constrained framework for organizing ethnographic and linguistic data — and exposes the data via a public REST API (Swagger/OpenAPI), a multilingual UI (currently French-only; `fr/en/es/pt` shape retained), and CSV/Excel exports.

## Executive Summary

|                  |                                                           |
| ---------------- | --------------------------------------------------------- |
| Project type     | `web` (Next.js App Router)                                |
| Primary language | TypeScript 5.8 (`strict: false`)                          |
| Framework        | Next.js 16.0.8 + React 18.3                               |
| Backend          | Supabase (PostgreSQL)                                     |
| Styling          | Tailwind CSS 3.4 + shadcn/ui (Radix)                      |
| State            | TanStack Query 5.83                                       |
| Testing          | Vitest 4 + Testing Library + happy-dom                    |
| API docs         | Swagger UI at `/docs/api`, OpenAPI spec at `/api/docs/v2` |
| Architecture     | Layered (route → handler → service) around AFRIK domain   |
| Repository       | monolith, single part                                     |
| Branching        | `main` (base) · `recette` (active)                        |

## Domain Model (AFRIK)

**Hierarchy:** Linguistic Family → Language → People → Country

**Stable identifiers:**

- Families: `FLG_xxxxx` (e.g., `FLG_BANTU`)
- Languages: ISO 639-3 (e.g., `swa`, `lin`)
- Peoples: `PPL_xxxxx` (e.g., `PPL_YORUBA`)
- Countries: ISO 3166-1 alpha-3 (e.g., `COM`, `ZAF`)

Details: see [Data Models](./data-models.md) and [API Contracts](./api-contracts.md).

## Repository Structure (high level)

- `src/app/` — Next.js App Router (pages under `[lang]/`, API under `api/v2/`)
- `src/api/v2/` — handlers, services, utils (business/data layer for API routes)
- `src/lib/` — shared libraries (Supabase clients, AFRIK loaders/parsers, logger, routing, translations)
- `src/components/` — UI components grouped by purpose (`layout/`, `views/`, `detail/`, `country/`, `search/`, `charts/`, `pages/`, `ui/`)
- `src/hooks/`, `src/types/`, `src/styles/` — React hooks, shared types, CSS tokens
- `supabase/migrations/` — SQL migrations (001–007)
- `scripts/` — AFRIK migration/validation scripts (`tsx scripts/*.ts`)
- `dataset/source/` — AFRIK source files (FLG / peuples / pays / langues)
- `public/` — static assets + strict data models (`modele-*.txt`)

Full annotated tree: [source-tree-analysis.md](./source-tree-analysis.md).

## Documentation Index

See [index.md](./index.md) for navigation to all generated and existing documents.

## Critical Context (read first)

The most important agent-facing rules live in `_bmad-output/project-context.md` (Supabase client isolation, AFRIK data discipline, V1→V2 invariants, Storybook framework constraint, French-only UI, mobile-first). Read that file before touching code.
