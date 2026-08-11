import type { Meta, StoryObj } from "@storybook/react";
import { ComparisonView } from "./ComparisonView";
import type { ComparisonPageData } from "@/types/compare";

// Mirrors the sibling CompareShareBar.stories.tsx viewport set — the three
// project comparator breakpoints exercised by the AC6 axe-core proof.
const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "900px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "900px" },
  },
};

const meta: Meta<typeof ComparisonView> = {
  title: "Compare/ComparisonView",
  component: ComparisonView,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
  },
};

export default meta;
type Story = StoryObj<typeof ComparisonView>;

// @req REQ-097 REQ-098
const twoUpData: ComparisonPageData = {
  type: "peuple",
  columns: [
    { id: "PPL_YORUBA", label: "Yoruba", type: "peuple" },
    { id: "PPL_IGBO", label: "Igbo", type: "peuple" },
  ],
  rows: [
    {
      key: "appellations",
      values: {
        PPL_YORUBA: {
          mainName: "Yoruba",
          selfAppellation: "Yoruba",
          linguisticFamily: "FLG_NIGER_CONGO",
          currentCountries: ["NGA", "BEN"],
        },
        PPL_IGBO: {
          mainName: "Igbo",
          selfAppellation: "Igbo",
          linguisticFamily: "FLG_NIGER_CONGO",
          currentCountries: ["NGA"],
        },
      },
    },
    {
      key: "demography",
      values: {
        PPL_YORUBA: { totalPopulation: 47000000 },
        PPL_IGBO: { totalPopulation: 32000000 },
      },
    },
  ],
};

// @req REQ-097 REQ-098
const threeUpData: ComparisonPageData = {
  type: "pays",
  columns: [
    { id: "SEN", label: "Sénégal", type: "pays" },
    { id: "MLI", label: "Mali", type: "pays" },
    { id: "GHA", label: "Ghana", type: "pays" },
  ],
  rows: [
    {
      key: "historicalNames",
      values: {
        SEN: { names: ["Sénégal"] },
        MLI: { names: ["Soudan français", "Mali"] },
        GHA: { names: ["Côte-de-l'Or", "Ghana"] },
      },
    },
    {
      key: "majorPeoples",
      values: {
        SEN: ["PPL_WOLOF", "PPL_PEUL"],
        MLI: ["PPL_BAMBARA"],
        GHA: ["PPL_ASHANTI", "PPL_AKAN"],
      },
    },
    {
      key: "demographics",
      values: {
        SEN: { totalPopulation: 17700000 },
        MLI: { totalPopulation: 21900000 },
        GHA: { totalPopulation: 33100000 },
      },
    },
  ],
};

// @req REQ-098
const sparseData: ComparisonPageData = {
  type: "peuple",
  columns: [
    { id: "PPL_YORUBA", label: "Yoruba", type: "peuple" },
    { id: "PPL_IGBO", label: "Igbo", type: "peuple" },
  ],
  rows: [
    {
      key: "appellations",
      values: {
        PPL_YORUBA: {
          mainName: "Yoruba",
          selfAppellation: "Yoruba",
          linguisticFamily: "FLG_NIGER_CONGO",
        },
        PPL_IGBO: null,
      },
    },
    {
      key: "historicalRole",
      values: {
        PPL_YORUBA: null,
        PPL_IGBO: { summary: "Réseaux commerciaux précoloniaux du Biafra." },
      },
    },
    {
      key: "demography",
      values: {
        PPL_YORUBA: { totalPopulation: 47000000 },
        PPL_IGBO: null,
      },
    },
  ],
};

// @req REQ-098
const allNullRowsDroppedData: ComparisonPageData = {
  type: "peuple",
  columns: [
    { id: "PPL_YORUBA", label: "Yoruba", type: "peuple" },
    { id: "PPL_IGBO", label: "Igbo", type: "peuple" },
  ],
  rows: [
    {
      key: "appellations",
      values: {
        PPL_YORUBA: { mainName: "Yoruba", selfAppellation: "Yoruba" },
        PPL_IGBO: { mainName: "Igbo", selfAppellation: "Igbo" },
      },
    },
    // Null for every entity — must be dropped entirely, not rendered as an
    // all-"non renseigné" row (FR61).
    { key: "culture", values: { PPL_YORUBA: null, PPL_IGBO: null } },
    { key: "organization", values: { PPL_YORUBA: null, PPL_IGBO: null } },
  ],
};

// @req REQ-097
export const TwoUpMobile430: Story = {
  name: "2-up · 430 px",
  args: { data: twoUpData },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-097
export const TwoUpTablet720: Story = {
  name: "2-up · 720 px",
  args: { data: twoUpData },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-097
export const TwoUpDesktop800: Story = {
  name: "2-up · 800 px",
  args: { data: twoUpData },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-097
export const ThreeUpMobile430: Story = {
  name: "3-up · 430 px",
  args: { data: threeUpData },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-097
export const ThreeUpTablet720: Story = {
  name: "3-up · 720 px",
  args: { data: threeUpData },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-097
export const ThreeUpDesktop800: Story = {
  name: "3-up · 800 px",
  args: { data: threeUpData },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-098
export const SparseMobile430: Story = {
  name: "Sparse (non renseigné) · 430 px",
  args: { data: sparseData },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-098
export const SparseTablet720: Story = {
  name: "Sparse (non renseigné) · 720 px",
  args: { data: sparseData },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-098
export const SparseDesktop800: Story = {
  name: "Sparse (non renseigné) · 800 px",
  args: { data: sparseData },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-098
export const AllNullRowsDroppedMobile430: Story = {
  name: "All-null rows dropped · 430 px",
  args: { data: allNullRowsDroppedData },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-098
export const AllNullRowsDroppedTablet720: Story = {
  name: "All-null rows dropped · 720 px",
  args: { data: allNullRowsDroppedData },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-098
export const AllNullRowsDroppedDesktop800: Story = {
  name: "All-null rows dropped · 800 px",
  args: { data: allNullRowsDroppedData },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
