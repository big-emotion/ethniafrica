import type { Meta, StoryObj } from "@storybook/react";

import { VoicesPanel } from "@/components/fiche/VoicesPanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import { YORUBA } from "@/components/fiche/__tests__/ficheContextFixtures";

/**
 * VoicesPanel and the OralNarrativesSection it wraps both read
 * /api/v2/oral-narratives, which has no server behind it in Storybook: left
 * alone the story settles on the empty branch and proofs nothing. This record's
 * only entity-specific fields come from the Yoruba fixture, and its summary
 * stays null — the panel's rights metadata and layout are what is under proof,
 * not a narrative we would have had to invent (R4).
 */
const PUBLISHED_NARRATIVES = {
  data: [
    {
      id: "ORAL_YORUBA_STORYBOOK",
      narratorDisplayName: null,
      community: YORUBA.nameMain,
      languageCode: YORUBA.languages.isoCodes[0],
      narrativeKind: "tradition",
      summary: null,
      variantOf: null,
    },
  ],
};

const meta = {
  title: "Fiche/VoicesPanel",
  component: VoicesPanel,
  tags: ["autodocs"],
  // Scoped to this file and restored on story teardown, so no other story
  // inherits a stubbed network.
  beforeEach: () => {
    const liveFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => PUBLISHED_NARRATIVES,
    })) as unknown as typeof fetch;

    return () => {
      globalThis.fetch = liveFetch;
    };
  },
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof VoicesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const yorubaVoices: Story = {
  args: {
    peopleId: YORUBA.id,
    size: "md",
    side: "left",
    stepLabel: "07 · Voix",
    heading: "Quelles voix ont été recueillies ?",
    body: "Les récits oraux publiés pour cette fiche, avec leurs métadonnées de droits.",
    sourceLine: {
      label: "Source : dossier AFRIK de la fiche",
      href: "#fiche-record",
    },
  },
};

export const Mobile430 = atFicheBreakpoint(yorubaVoices, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(yorubaVoices, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(yorubaVoices, "ficheDesktop800");
