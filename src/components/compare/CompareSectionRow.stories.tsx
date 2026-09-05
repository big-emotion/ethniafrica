import type { Meta, StoryObj } from "@storybook/react";
import { CompareSectionRow } from "./CompareSectionRow";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type { ComparisonColumn, ComparisonRow } from "@/types/compare";

const entities: ComparisonColumn[] = [
  { id: "PPL_WOLOF", label: "Wolof", type: "peuple" },
  { id: "PPL_SERER", label: "Sérère", type: "peuple" },
];

const appellationsRow: ComparisonRow = {
  key: "appellations",
  values: {
    PPL_WOLOF: {
      mainName: "Wolof",
      selfAppellation: "Wolof",
      linguisticFamily: "FLG_ATLANTIQUE",
      currentCountries: ["SEN", "GMB", "MRT"],
    },
    PPL_SERER: {
      mainName: "Sérère",
      selfAppellation: "Sereer",
      linguisticFamily: "FLG_ATLANTIQUE",
      currentCountries: ["SEN"],
    },
  },
};

const sparseRow: ComparisonRow = {
  key: "historicalRole",
  values: {
    PPL_WOLOF: {
      summary: "Royaume du Jolof, réseaux commerciaux atlantiques.",
    },
    PPL_SERER: null,
  },
};

const meta = {
  title: "Compare/CompareSectionRow",
  component: CompareSectionRow,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
  args: { entities, entityType: "peuple" },
} satisfies Meta<typeof CompareSectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const filled: Story = {
  name: "Filled (both entities)",
  args: { language: "fr", row: appellationsRow },
};

const sparse: Story = {
  name: "Sparse (one entity non renseigné)",
  args: { language: "fr", row: sparseRow },
};

// @req REQ-097
export const Mobile430 = atFicheBreakpoint(filled, "ficheMobile430");
// @req REQ-097
export const Tablet720 = atFicheBreakpoint(sparse, "ficheTablet720");
// @req REQ-097
export const Desktop800 = atFicheBreakpoint(filled, "ficheDesktop800");
