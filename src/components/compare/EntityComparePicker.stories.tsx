import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EntityComparePicker } from "./EntityComparePicker";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type {
  CompareCandidate,
  CompareEntityType,
} from "@/hooks/use-compare-selection";

const PEOPLES: CompareCandidate[] = [
  { id: "PPL_YORUBA", type: "peoples", exonym: "Yoruba", autonym: "Yorùbá" },
  { id: "PPL_ZULU", type: "peoples", exonym: "Zulu", autonym: "AmaZulu" },
  { id: "PPL_SHONA", type: "peoples", exonym: "Shona" },
];

const COUNTRIES: CompareCandidate[] = [
  { id: "SEN", type: "countries", exonym: "Sénégal" },
  { id: "NGA", type: "countries", exonym: "Nigéria" },
];

const FAMILIES: CompareCandidate[] = [
  { id: "FLG_BANTU", type: "language-families", exonym: "Bantu" },
  { id: "FLG_MANDE", type: "language-families", exonym: "Mandé" },
  { id: "FLG_NIGERCONGO", type: "language-families", exonym: "Niger-Congo" },
];

async function storySuggestions(type: CompareEntityType) {
  if (type === "peoples") return PEOPLES;
  if (type === "countries") return COUNTRIES;
  return FAMILIES;
}

const meta = {
  title: "Compare/EntityComparePicker",
  component: EntityComparePicker,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  args: {
    fetchSuggestions: storySuggestions,
  },
} satisfies Meta<typeof EntityComparePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const base: Story = {};

// @req REQ-097
export const Mobile430 = atFicheBreakpoint(base, "ficheMobile430");
// @req REQ-097
export const Tablet720 = atFicheBreakpoint(base, "ficheTablet720");
// @req REQ-097
export const Desktop800 = atFicheBreakpoint(base, "ficheDesktop800");
