import type { Meta, StoryObj } from "@storybook/react";

import { IdentityPanel } from "@/components/fiche/IdentityPanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import {
  YORUBA,
  YORUBA_NAMES_DOSSIER,
} from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/IdentityPanel",
  component: IdentityPanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof IdentityPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const yorubaIdentity: Story = {
  args: {
    peopleId: YORUBA.id,
    nameMain: YORUBA.nameMain,
    dossier: YORUBA_NAMES_DOSSIER,
  },
};

export const Mobile430 = atFicheBreakpoint(yorubaIdentity, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(yorubaIdentity, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(yorubaIdentity, "ficheDesktop800");
