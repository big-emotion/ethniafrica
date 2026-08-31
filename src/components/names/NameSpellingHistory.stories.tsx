import type { Meta, StoryObj } from "@storybook/react";

import { NameSpellingHistory } from "@/components/names/NameSpellingHistory";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import type { NameSpellingHistoryEntry } from "@/types/names";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "400px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "400px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "400px" },
  },
};

const historicalSpellings: NameSpellingHistoryEntry[] = [
  {
    nameText: "Congo",
    periodLabel: "1885-1908",
    confidenceChip: (
      <ConfidenceChip
        confidenceScore={82}
        sourceCount={4}
        lastHumanAuditAt="2025-04-12"
      />
    ),
  },
  {
    nameText: "Congo belge",
    periodLabel: "1908-1960",
    confidenceChip: (
      <ConfidenceChip
        confidenceScore={88}
        sourceCount={6}
        lastHumanAuditAt="2025-04-12"
      />
    ),
  },
  {
    nameText: "Kongo",
    periodLabel: "1960-présent",
    confidenceChip: (
      <ConfidenceChip
        confidenceScore={95}
        sourceCount={7}
        lastHumanAuditAt="2025-09-21"
      />
    ),
  },
];

const meta = {
  title: "Names/NameSpellingHistory",
  component: NameSpellingHistory,
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
} satisfies Meta<typeof NameSpellingHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-056
export const Historical430: Story = {
  name: "Historique — 430 px",
  args: { spellings: historicalSpellings },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-056
export const Historical720: Story = {
  name: "Historique — 720 px",
  args: { spellings: historicalSpellings },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-056
export const Empty800: Story = {
  name: "Aucune graphie — 800 px",
  args: { spellings: [] },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
