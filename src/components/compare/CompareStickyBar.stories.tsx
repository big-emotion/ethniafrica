import type { Meta, StoryObj } from "@storybook/react";
import { CompareStickyBar } from "./CompareStickyBar";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";

const meta = {
  title: "Compare/CompareStickyBar",
  component: CompareStickyBar,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof CompareStickyBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const belowMinimum: Story = {
  name: "Below minimum (1/3, comparer disabled)",
  args: { count: 1, onCompare: () => {} },
};

const readyToCompare: Story = {
  name: "Ready to compare (2/3)",
  args: { count: 2, onCompare: () => {} },
};

const full: Story = {
  name: "Full selection (3/3)",
  args: { count: 3, onCompare: () => {} },
};

// @req REQ-097
export const Mobile430 = atFicheBreakpoint(belowMinimum, "ficheMobile430");
// @req REQ-097
export const Tablet720 = atFicheBreakpoint(readyToCompare, "ficheTablet720");
// @req REQ-097
export const Desktop800 = atFicheBreakpoint(full, "ficheDesktop800");
