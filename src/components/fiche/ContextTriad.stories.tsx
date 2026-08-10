import type { Meta, StoryObj } from "@storybook/react";

import { ContextTriad } from "@/components/fiche/ContextTriad";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type { FichePanelContext } from "@/components/fiche/panelRegistry";
import { YORUBA } from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/ContextTriad",
  component: ContextTriad,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof ContextTriad>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The people fiche is the case where both hierarchy axes resolve to chips —
 * one family plus a nameable country set — so it exercises every node form the
 * bar can take except the counter.
 */
const yorubaContext: FichePanelContext = {
  entityType: "people",
  payload: YORUBA,
};

const peopleTriad: Story = {
  args: { context: yorubaContext },
};

export const Mobile430 = atFicheBreakpoint(peopleTriad, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(peopleTriad, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(peopleTriad, "ficheDesktop800");
