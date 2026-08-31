import type { Meta, StoryObj } from "@storybook/react";
import { FragmentationView } from "./FragmentationView";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

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

const withColonialBorder: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋeawo",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 0.55,
      assertionId: "assertion-gha",
    },
    {
      iso3: "TGO",
      nameFr: "Togo",
      populationShare: 0.45,
      assertionId: null,
    },
  ],
  borderPairs: [
    {
      a: "GHA",
      b: "TGO",
      colonialOrigin: {
        layerId: "layer-anglo-french-1919",
        sourceIds: ["src-1"],
      },
    },
  ],
};

const withoutColonialBorder: PeopleFragmentation = {
  ...withColonialBorder,
  peopleId: "PPL_MANDE",
  autonym: "Mandenka",
  exonym: "Mandé",
  borderPairs: [{ a: "GHA", b: "TGO" }],
};

const singleCountry: PeopleFragmentation = {
  peopleId: "PPL_SOLO",
  autonym: "Solo",
  exonym: "Solo",
  countryCount: 1,
  countries: [
    { iso3: "GHA", nameFr: "Ghana", populationShare: 1, assertionId: null },
  ],
  borderPairs: [],
};

const meta: Meta<typeof FragmentationView> = {
  title: "Colonization/FragmentationView",
  component: FragmentationView,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "Text-first fragmentation view for FR85 (Epic 13, Story 13.7) — no map involved. " +
          "Lists the countries a people spans with their demographic share, each traceable to " +
          "its source via ConfidenceChip → SourceChainSheet. Colonial-origin border pairs are " +
          "annotated with the --afh-color-colonial marker plus an explicit text label — never " +
          "color alone. Renders nothing for a people confined to a single country.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FragmentationView>;

// @req REQ-091
export const MultiCountryWithColonialBorder: Story = {
  name: "Multi-country · colonial border pair",
  args: {
    fragmentation: withColonialBorder,
    variant: "fiche-section",
  },
};

// @req REQ-091
export const MultiCountryWithoutColonialOrigin: Story = {
  name: "Multi-country · no documented colonial origin",
  args: {
    fragmentation: withoutColonialBorder,
    variant: "fiche-section",
  },
};

// @req REQ-091
export const SingleCountry: Story = {
  name: "Single country · renders nothing",
  args: {
    fragmentation: singleCountry,
    variant: "fiche-section",
  },
};

// @req REQ-091
export const Mobile430: Story = {
  name: "Fiche section · 430 px",
  args: {
    fragmentation: withColonialBorder,
    variant: "fiche-section",
  },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-091
export const Tablet720: Story = {
  name: "Fiche section · 720 px",
  args: {
    fragmentation: withColonialBorder,
    variant: "fiche-section",
  },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-091
export const Desktop800: Story = {
  name: "Fiche section · 800 px",
  args: {
    fragmentation: withColonialBorder,
    variant: "fiche-section",
  },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-091
export const ModuleIndex: Story = {
  name: "Module index · compact",
  args: {
    fragmentation: withColonialBorder,
    variant: "module-index",
  },
};
