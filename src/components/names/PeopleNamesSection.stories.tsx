import type { Meta, StoryObj } from "@storybook/react";

import { PeopleNamesSection } from "@/components/names/PeopleNamesSection";
import type { PeopleNamesData } from "@/lib/peopleDataTransformer";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "900px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "900px" },
  },
};

const populatedNames: PeopleNamesData = {
  autonym: "Jieng",
  endonyms: [
    {
      record: {
        nameText: "Jieng",
        nameType: "endonym",
        languageOfOrigin: "din",
        meaning: "peuple",
        periodLabel: null,
        imposedBy: null,
        impositionPeriod: null,
        whyProblematic: null,
        contemporaryUsage: null,
      },
      confidenceScore: 90,
      sourceCount: 3,
      lastHumanAuditAt: "2025-09-21",
    },
  ],
  exonyms: [
    {
      record: {
        nameText: "Dinka",
        nameType: "exonym",
        languageOfOrigin: null,
        meaning: null,
        periodLabel: null,
        imposedBy: "administration coloniale britannique",
        impositionPeriod: "1898-1956",
        whyProblematic: "efface l'auto-appellation Jieng",
        contemporaryUsage: "toujours utilisé internationalement",
      },
      confidenceScore: 78,
      sourceCount: 5,
      lastHumanAuditAt: "2025-06-01",
    },
  ],
  spellingHistory: [
    {
      nameText: "Denka",
      periodLabel: "1850-1900",
      confidenceScore: 60,
      sourceCount: 2,
      lastHumanAuditAt: "2025-02-01",
    },
  ],
};

const meta = {
  title: "Names/PeopleNamesSection",
  component: PeopleNamesSection,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: {
      test: "error",
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      },
    },
  },
} satisfies Meta<typeof PeopleNamesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-054 REQ-056
export const Populated430: Story = {
  name: "Endonymes, exonyme imposé & graphie historique — 430 px",
  args: { language: "fr", data: populatedNames },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-054 REQ-056
export const Populated720: Story = {
  name: "Endonymes, exonyme imposé & graphie historique — 720 px",
  args: { language: "fr", data: populatedNames },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-119
export const Empty800: Story = {
  name: "Aucun nom publié — donnée manquante (REQ-119) — 800 px",
  args: { language: "fr", data: null },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
