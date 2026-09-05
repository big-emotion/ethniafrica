import type { Meta, StoryObj } from "@storybook/react";
import { CompareValueCell } from "./CompareValueCell";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type { ComparisonColumn } from "@/types/compare";

const entity: ComparisonColumn = {
  id: "PPL_WOLOF",
  label: "Wolof",
  type: "peuple",
};

const meta = {
  title: "Compare/CompareValueCell",
  component: CompareValueCell,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
  args: { entity },
} satisfies Meta<typeof CompareValueCell>;

export default meta;
type Story = StoryObj<typeof meta>;

const scalar: Story = {
  name: "Scalar text value",
  args: { value: "Royaume du Jolof" },
};

const relationalId: Story = {
  name: "Relational AFRIK id (linked)",
  args: { value: "PPL_SERER" },
};

const demography: Story = {
  name: "With reference year (demography row)",
  args: { value: 47000000, showReferenceYear: true },
};

const empty: Story = {
  name: "Empty (non renseigné)",
  args: { value: null },
};

// @req REQ-097
export const Mobile430 = atFicheBreakpoint(scalar, "ficheMobile430");
// @req REQ-097
export const Tablet720 = atFicheBreakpoint(relationalId, "ficheTablet720");
// @req REQ-097
export const Desktop800 = atFicheBreakpoint(demography, "ficheDesktop800");
// @req REQ-097
export const EmptyMobile430 = atFicheBreakpoint(empty, "ficheMobile430");
