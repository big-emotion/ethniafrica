import type { Meta, StoryObj } from "@storybook/react";

import { CitationBlock } from "@/components/system/CitationBlock";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "820px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "820px" },
  },
  desktop1200: {
    name: "Desktop 1200 px",
    styles: { width: "1200px", height: "820px" },
  },
};

const meta = {
  title: "System/CitationBlock",
  component: CitationBlock,
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
    title: "Entrée de référence (Autonyme / Exonyme)",
    liveUrl: "https://example.org/fr/fiches/entree-de-reference",
    accessedAt: new Date("2026-07-14T12:00:00.000Z"),
  },
} satisfies Meta<typeof CitationBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveMobile430: Story = {
  name: "Live version — 430 px",
  parameters: {
    viewport: { defaultViewport: "mobile430" },
  },
};

export const PinnedTablet720: Story = {
  name: "Pinned version — 720 px",
  args: {
    pinned: {
      version: 7,
      url: "https://example.org/fr/fiches/entree-de-reference@v7",
    },
    defaultVariant: "pinned",
    defaultFormat: "markdown",
  },
  parameters: {
    viewport: { defaultViewport: "tablet720" },
  },
};

export const PinnedDesktop1200: Story = {
  name: "Pinned version — 1200 px",
  args: {
    pinned: {
      version: 7,
      url: "https://example.org/fr/fiches/entree-de-reference@v7",
    },
    defaultVariant: "pinned",
  },
  parameters: {
    viewport: { defaultViewport: "desktop1200" },
  },
};
