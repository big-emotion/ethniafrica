import type { Meta, StoryObj } from "@storybook/react";
import { HomeHero } from "./HomeHero";

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

const meta: Meta<typeof HomeHero> = {
  title: "Home/HomeHero",
  component: HomeHero,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { viewports },
    a11y: { disable: false },
  },
};

export default meta;
type Story = StoryObj<typeof HomeHero>;

// @req REQ-044
export const Mobile430: Story = {
  name: "Default · 430 px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-044
export const Tablet720: Story = {
  name: "Default · 720 px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-044
export const Desktop800: Story = {
  name: "Default · 800 px",
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
