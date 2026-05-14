import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import SourceChainSheet, {
  type Source,
  type SourceChainSheetProps,
} from "./SourceChainSheet";

const primarySource: Source = {
  id: "s-primary-1",
  title: "Atlas linguistique de l'Afrique de l'Ouest",
  author: "Diop, M.",
  year: 2019,
  page: "p. 142",
  url: "https://www.example.org/atlas-afrique-ouest",
  tier: "primary",
  brokenAt: null,
};

const secondarySource: Source = {
  id: "s-secondary-1",
  title: "Histoire générale de l'Afrique — Tome IV",
  author: "UNESCO",
  year: 1985,
  page: "ch. 12",
  url: "https://unesdoc.unesco.org/ark:/example",
  tier: "secondary",
  brokenAt: null,
};

const tertiarySource: Source = {
  id: "s-tertiary-1",
  title: "Wikipedia — Histoire du Sénégal",
  url: "https://fr.wikipedia.org/wiki/Histoire_du_S%C3%A9n%C3%A9gal",
  tier: "tertiary",
  brokenAt: null,
};

const brokenSource: Source = {
  id: "s-broken-1",
  title: "Page institutionnelle disparue",
  author: "Ministère de la Culture",
  year: 2010,
  url: "https://archive.example.gov/page-disparue",
  tier: "secondary",
  brokenAt: "2026-04-10",
};

const aiSource: Source = {
  id: "s-ai-1",
  title: "Synthèse générée par IA (validation humaine en attente)",
  tier: "ai-enriched",
  brokenAt: null,
};

/* -------------------------------------------------------------------------- */
/*  Wrapper to open the sheet on click — makes Storybook interactions nice    */
/* -------------------------------------------------------------------------- */

const Demo: React.FC<Omit<SourceChainSheetProps, "open" | "onOpenChange">> = (
  props
) => {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="min-h-[400px] p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
      >
        Ouvrir la chaîne des sources
      </button>
      <SourceChainSheet {...props} open={open} onOpenChange={setOpen} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */

const meta: Meta<typeof Demo> = {
  title: "SourceTransparency/SourceChainSheet",
  component: Demo,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

/* ----- Single position --------------------------------------------------- */

export const SinglePosition: Story = {
  args: {
    anchorId: "chip-paragraph-1",
    assertion: {
      statement:
        "Le peuple Seereer est historiquement attesté dans le bassin du Saloum dès le XIIIe siècle.",
      confidenceScore: 0.84,
      sourceCount: 3,
      lastHumanAuditAt: "2026-04-01",
    },
    sources: [primarySource, secondarySource, tertiarySource],
  },
};

/* ----- Multi-perspective (FR24) ------------------------------------------ */

export const MultiPerspective: Story = {
  args: {
    anchorId: "chip-paragraph-7",
    assertion: {
      statement:
        "L'origine du peuple est disputée par plusieurs courants historiographiques.",
      confidenceScore: 0.55,
      sourceCount: 4,
      lastHumanAuditAt: "2026-03-15",
    },
    sources: [],
    positions: [
      {
        position: "Hypothèse nilo-saharienne",
        sources: [
          { ...primarySource, id: "pos1-s1", title: "Étude linguistique 1972" },
          { ...secondarySource, id: "pos1-s2", title: "Monographie 1988" },
        ],
      },
      {
        position: "Hypothèse bantoue méridionale",
        sources: [
          { ...primarySource, id: "pos2-s1", title: "Analyse génétique 2018" },
          { ...tertiarySource, id: "pos2-s2", title: "Vue d'ensemble web" },
        ],
      },
    ],
  },
};

/* ----- Broken link ------------------------------------------------------- */

export const BrokenLink: Story = {
  args: {
    anchorId: "chip-paragraph-broken",
    assertion: {
      statement:
        "Le royaume cité disposait d'un système monétaire propre au XVIIIe siècle.",
      confidenceScore: 0.62,
      sourceCount: 2,
      lastHumanAuditAt: null,
    },
    sources: [primarySource, brokenSource],
    openFlagCount: 1,
  },
};

/* ----- Missing data ------------------------------------------------------ */

export const MissingData: Story = {
  args: {
    anchorId: "chip-paragraph-empty",
    assertion: {
      statement: "Assertion ajoutée par enrichissement IA, sans audit humain.",
      confidenceScore: 0.35,
      sourceCount: 1,
      lastHumanAuditAt: null,
    },
    sources: [aiSource],
  },
};

/* ----- Mobile viewport --------------------------------------------------- */

export const Mobile: Story = {
  args: SinglePosition.args,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/* ----- Tablet viewport --------------------------------------------------- */

export const Tablet: Story = {
  args: SinglePosition.args,
  parameters: { viewport: { defaultViewport: "tablet" } },
};

/* ----- Desktop viewport -------------------------------------------------- */

export const Desktop: Story = {
  args: {
    ...SinglePosition.args,
    openFlagCount: 2,
    revisionUrl: "https://example.org/revision-history",
  },
  parameters: { viewport: { defaultViewport: "desktop" } },
};
