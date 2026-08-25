import type { Meta, StoryObj } from "@storybook/react";
import { BorderCrossingTable } from "./BorderCrossingTable";
import type { BorderCrossing } from "./BorderCrossingTable";

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

const sourcedCrossings: BorderCrossing[] = [
  {
    countryA: { iso3: "GHA", nameFr: "Ghana" },
    countryB: { iso3: "TGO", nameFr: "Togo" },
    peoples: [{ peopleId: "PPL_EWE", autonym: "Eʋeawo", exonym: "Ewe" }],
    sources: [
      {
        id: "src-anglo-french-1919",
        title: "Convention anglo-française de 1919",
        url: "https://example.org/anglo-french-1919",
      },
    ],
  },
  {
    countryA: { iso3: "BEN", nameFr: "Bénin" },
    countryB: { iso3: "NGA", nameFr: "Nigeria" },
    peoples: [{ peopleId: "PPL_YORUBA", autonym: "Yorùbá", exonym: "Yoruba" }],
    sources: [],
  },
];

const empty: BorderCrossing[] = [];

const meta: Meta<typeof BorderCrossingTable> = {
  title: "Colonization/BorderCrossingTable",
  component: BorderCrossingTable,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "Text-first equivalent of ColonialBorderOverlay (Epic 13, Story 13.8) — always in the " +
          "DOM, server-rendered, not gated by the map toggle. Lists border pairs, the peoples they " +
          "cross, and source links. Renders a '—' placeholder (never a broken link) when a crossing " +
          "has no documented source yet.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BorderCrossingTable>;

// @req REQ-091
export const WithCrossings: Story = {
  name: "Sourced and unsourced crossings",
  args: { crossings: sourcedCrossings },
};

// @req REQ-091
export const NoCrossings: Story = {
  name: "No crossings · renders nothing",
  args: { crossings: empty },
};

// @req REQ-091
export const Mobile430: Story = {
  name: "430 px",
  args: { crossings: sourcedCrossings },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-091
export const Tablet720: Story = {
  name: "720 px",
  args: { crossings: sourcedCrossings },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-091
export const Desktop800: Story = {
  name: "800 px",
  args: { crossings: sourcedCrossings },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
