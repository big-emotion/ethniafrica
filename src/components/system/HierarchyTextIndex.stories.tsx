import type { Meta, StoryObj } from "@storybook/react";

import { HierarchyTextIndex } from "@/components/system/HierarchyTextIndex";
import { hierarchyFixture } from "@/components/system/__fixtures__/hierarchy.fixture";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "820px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "820px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "820px" },
  },
};

const meta = {
  title: "System/HierarchyTextIndex",
  component: HierarchyTextIndex,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <main className="min-h-screen bg-afh-bg p-afh-lg md:p-afh-5xl">
        <div className="mx-auto max-w-[800px]">
          <Story />
        </div>
      </main>
    ),
  ],
  parameters: {
    layout: "fullscreen",
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
  args: {
    nodes: hierarchyFixture,
  },
} satisfies Meta<typeof HierarchyTextIndex>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-047
export const Mobile430: Story = {
  name: "Mobile (430px)",
  parameters: {
    viewport: { defaultViewport: "mobile430" },
  },
};

// @req REQ-047
export const Tablet720: Story = {
  name: "Tablet (720px)",
  parameters: {
    viewport: { defaultViewport: "tablet720" },
  },
};

// @req REQ-047
export const Desktop800: Story = {
  name: "Desktop (800px)",
  parameters: {
    viewport: { defaultViewport: "desktop800" },
  },
};
