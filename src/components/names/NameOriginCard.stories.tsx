import type { Meta, StoryObj } from "@storybook/react";

import { NameOriginCard } from "@/components/names/NameOriginCard";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import type { NameRecordView } from "@/types/names";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "500px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "500px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "500px" },
  },
};

const endonymRecord: NameRecordView = {
  nameText: "Kongo",
  nameType: "endonym",
  languageOfOrigin: "kon",
  meaning: "peuple du fleuve",
  periodLabel: null,
  imposedBy: null,
  impositionPeriod: null,
  whyProblematic: null,
  contemporaryUsage: null,
};

const imposedExonymRecord: NameRecordView = {
  nameText: "Congo",
  nameType: "exonym",
  languageOfOrigin: null,
  meaning: null,
  periodLabel: null,
  imposedBy: "administration coloniale belge",
  impositionPeriod: "1885-1908",
  whyProblematic:
    "efface l'auto-appellation et impose une orthographe coloniale",
  contemporaryUsage: "encore utilisé dans certains textes administratifs",
};

const emptyRecord: NameRecordView = {
  nameText: "Kongo",
  nameType: "endonym",
  languageOfOrigin: null,
  meaning: null,
  periodLabel: null,
  imposedBy: null,
  impositionPeriod: null,
  whyProblematic: null,
  contemporaryUsage: null,
};

const meta = {
  title: "Names/NameOriginCard",
  component: NameOriginCard,
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
} satisfies Meta<typeof NameOriginCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-056
export const Endonym430: Story = {
  name: "Endonyme — 430 px",
  args: {
    record: endonymRecord,
    confidenceChip: (
      <ConfidenceChip
        confidenceScore={92}
        sourceCount={3}
        lastHumanAuditAt="2025-09-21"
      />
    ),
  },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-056
export const ImposedExonym720: Story = {
  name: "Exonyme imposé — 720 px",
  args: {
    record: imposedExonymRecord,
    confidenceChip: (
      <ConfidenceChip
        confidenceScore={78}
        sourceCount={5}
        lastHumanAuditAt="2025-06-01"
      />
    ),
  },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-056
export const Empty800: Story = {
  name: "Champs optionnels absents — 800 px",
  args: {
    record: emptyRecord,
    confidenceChip: (
      <ConfidenceChip
        confidenceScore={null}
        sourceCount={null}
        lastHumanAuditAt={null}
      />
    ),
  },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
