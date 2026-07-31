import type { Meta, StoryObj } from "@storybook/react";

import { NameTypeBadge } from "@/components/names/NameTypeBadge";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "200px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "200px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "200px" },
  },
};

const meta = {
  title: "Names/NameTypeBadge",
  component: NameTypeBadge,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: {
      test: "error",
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      },
    },
  },
} satisfies Meta<typeof NameTypeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-056
export const Endonym430: Story = {
  name: "Endonyme — 430 px",
  args: { nameType: "endonym" },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-056
export const ImposedExonym720: Story = {
  name: "Exonyme imposé — 720 px",
  args: { nameType: "exonym", imposed: true },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-056
export const Historical800: Story = {
  name: "Graphie historique — 800 px",
  args: { nameType: "historical_spelling" },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-056
export const Surname: Story = {
  name: "Patronyme",
  args: { nameType: "surname" },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};
