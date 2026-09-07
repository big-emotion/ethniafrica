import type { Meta, StoryObj } from "@storybook/react";
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
import type { LanguageFamily } from "@/types/afrik";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "1024px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "900px" },
  },
};

const familyFixture: LanguageFamily = {
  id: "FLG_STORYBOOK",
  nameFr: "Fiche de démonstration",
  content: {},
};

const meta: Meta<typeof LanguageFamilyDetailViewV2> = {
  title: "Family/LanguageFamilyDetailViewV2",
  component: LanguageFamilyDetailViewV2,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { viewports },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
  },
  args: { language: "fr", family: familyFixture },
};

export default meta;
type Story = StoryObj<typeof LanguageFamilyDetailViewV2>;

// @req REQ-047
export const Mobile: Story = {
  name: "Mobile — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-047
export const Tablet: Story = {
  name: "Tablet — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-047
export const Desktop: Story = {
  name: "Desktop — 800px",
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
