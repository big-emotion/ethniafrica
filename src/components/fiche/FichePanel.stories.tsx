import type { Meta, StoryObj } from "@storybook/react";

import { FichePanel } from "@/components/fiche/FichePanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";

const meta = {
  title: "Fiche/FichePanel",
  component: FichePanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof FichePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * FichePanel is the contract, not a chapter, so the canvas carries a
 * structural placeholder rather than a dataviz — nothing here should read as
 * an assertion about an entity.
 */
const chapterAnatomy: Story = {
  args: {
    size: "md",
    side: "left",
    sourceLine: {
      label: "Source : dossier AFRIK de la fiche",
      href: "#fiche-record",
    },
    data: {
      stepLabel: "00 · Chapitre",
      heading: "De quoi un chapitre est-il fait ?",
      body: "Libellé d'étape, titre, corps, ligne de source et zone visuelle : le gabarit partagé par tous les chapitres de fiche.",
      canvas: (
        <div className="flex h-full items-center justify-center p-afh-lg text-afh-caption uppercase tracking-wide text-afh-text-soft">
          Zone visuelle du chapitre
        </div>
      ),
    },
  },
};

export const Mobile430 = atFicheBreakpoint(chapterAnatomy, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(chapterAnatomy, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(chapterAnatomy, "ficheDesktop800");
