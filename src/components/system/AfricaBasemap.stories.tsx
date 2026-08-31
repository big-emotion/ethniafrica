import type { Meta, StoryObj } from "@storybook/react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";

const meta = {
  title: "System/AfricaBasemap",
  component: AfricaBasemap,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof AfricaBasemap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Bare foundation — no overlay layers, decorative (aria-hidden). */
const base: Story = {};

// @req REQ-101
export const Mobile430 = atFicheBreakpoint(base, "ficheMobile430");
// @req REQ-101
export const Tablet720 = atFicheBreakpoint(base, "ficheTablet720");
// @req REQ-101
export const Desktop800 = atFicheBreakpoint(base, "ficheDesktop800");
