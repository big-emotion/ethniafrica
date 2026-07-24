import type { Meta, StoryObj } from "@storybook/react";
import { type ComponentProps, useEffect, useState } from "react";
import { PinnedVersionBanner } from "./PinnedVersionBanner";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "1024px" },
  },
  desktop1200: {
    name: "Desktop 1200 px",
    styles: { width: "1200px", height: "900px" },
  },
};

const meta: Meta<typeof PinnedVersionBanner> = {
  title: "Source Transparency/PinnedVersionBanner",
  component: PinnedVersionBanner,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
  },
  argTypes: {
    pinnedAt: { control: "text" },
    versionTag: { control: "text" },
    liveUrl: { control: "text" },
    resolvedFlagsCount: {
      control: { type: "number", min: 0 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PinnedVersionBanner>;

const defaultArgs = {
  pinnedAt: "2025-09-21T18:30:00.000Z",
  versionTag: "v34",
  liveUrl: "/fr/peuples/yoruba",
};

function PreCollapsedStory(props: ComponentProps<typeof PinnedVersionBanner>) {
  const storageKey = `pinned-version-banner:collapsed:${props.liveUrl}`;
  const [seeded] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      return false;
    }
    return true;
  });

  useEffect(
    () => () => {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Story cleanup remains optional when storage is disabled.
      }
    },
    [storageKey]
  );

  if (!seeded && typeof window !== "undefined") return null;
  return <PinnedVersionBanner {...props} />;
}

// @req REQ-019
export const DefaultMobile430: Story = {
  name: "Default · 430 px",
  args: defaultArgs,
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-019
export const DefaultTablet720: Story = {
  name: "Default · 720 px",
  args: defaultArgs,
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-019
export const DefaultDesktop1200: Story = {
  name: "Default · 1200 px",
  args: defaultArgs,
  parameters: { viewport: { defaultViewport: "desktop1200" } },
};

// @req REQ-019
export const PreDismissedMobile430: Story = {
  name: "Pre-dismissed · 430 px",
  args: {
    ...defaultArgs,
    liveUrl: "/fr/peuples/yoruba?story=collapsed-mobile",
  },
  render: (args) => <PreCollapsedStory {...args} />,
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-019
export const PreDismissedTablet720: Story = {
  name: "Pre-dismissed · 720 px",
  args: {
    ...defaultArgs,
    liveUrl: "/fr/peuples/yoruba?story=collapsed-tablet",
  },
  render: (args) => <PreCollapsedStory {...args} />,
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-019
export const PreDismissedDesktop1200: Story = {
  name: "Pre-dismissed · 1200 px",
  args: {
    ...defaultArgs,
    liveUrl: "/fr/peuples/yoruba?story=collapsed-desktop",
  },
  render: (args) => <PreCollapsedStory {...args} />,
  parameters: { viewport: { defaultViewport: "desktop1200" } },
};

// @req REQ-019
export const ResolvedFlagsMobile430: Story = {
  name: "Resolved flags · 430 px",
  args: { ...defaultArgs, resolvedFlagsCount: 2 },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-019
export const ResolvedFlagsTablet720: Story = {
  name: "Resolved flags · 720 px",
  args: { ...defaultArgs, resolvedFlagsCount: 2 },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-019
export const ResolvedFlagsDesktop1200: Story = {
  name: "Resolved flags · 1200 px",
  args: { ...defaultArgs, resolvedFlagsCount: 2 },
  parameters: { viewport: { defaultViewport: "desktop1200" } },
};
