import type { Meta, StoryObj } from "@storybook/react";
import { CompareEntityHeader } from "./CompareEntityHeader";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type { ComparisonColumn } from "@/types/compare";

const auditedColumn: ComparisonColumn = {
  id: "PPL_WOLOF",
  label: "Wolof",
  type: "peuple",
  confidence: { score: 0.82, sourceCount: 5, lastHumanAuditAt: "2025-09-21" },
};

const unauditedColumn: ComparisonColumn = {
  id: "PPL_SERER",
  label: "Sérère",
  type: "peuple",
};

const contestedColumn: ComparisonColumn = {
  id: "PPL_ILLUSTRATIVE_CONTESTED",
  label: "Peuple Illustratif Contesté",
  type: "peuple",
  confidence: { score: 0.55, sourceCount: 2, lastHumanAuditAt: "2025-01-10" },
  classificationStatus: "contested",
};

const meta = {
  title: "Compare/CompareEntityHeader",
  component: CompareEntityHeader,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof CompareEntityHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const audited: Story = {
  name: "Audited (confidence chip)",
  args: { language: "fr", column: auditedColumn },
};

const unaudited: Story = {
  name: "Unaudited (no confidence_scores row)",
  args: { language: "fr", column: unauditedColumn },
};

const contested: Story = {
  name: "Contested classification",
  args: { language: "fr", column: contestedColumn },
};

// @req REQ-097
export const Mobile430 = atFicheBreakpoint(audited, "ficheMobile430");
// @req REQ-097
export const Tablet720 = atFicheBreakpoint(unaudited, "ficheTablet720");
// @req REQ-097
export const Desktop800 = atFicheBreakpoint(contested, "ficheDesktop800");
