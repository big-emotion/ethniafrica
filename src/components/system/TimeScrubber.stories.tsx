import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import {
  TimeScrubber,
  type TimeScrubberProps,
} from "@/components/system/TimeScrubber";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "300px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "300px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "300px" },
  },
};

// Controlled wrapper: the component is a fully controlled input, so the
// story needs local state for the thumb to move under keyboard/pointer
// interaction in the Storybook canvas.
function ControlledTimeScrubber(props: TimeScrubberProps) {
  const [value, setValue] = React.useState(props.value);
  return <TimeScrubber {...props} value={value} onChange={setValue} />;
}

// Forces window.matchMedia('(prefers-reduced-motion: reduce)') to report
// `matches` for the story. Storybook `loaders` run before the story mounts
// and outside the component tree, so this is safe from render purity rules
// that a decorator (itself a component) would trip.
function reducedMotionLoader(matches: boolean) {
  return async () => {
    if (typeof window !== "undefined") {
      window.matchMedia = ((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" && matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;
    }
    return {};
  };
}

const meta = {
  title: "System/TimeScrubber",
  component: ControlledTimeScrubber,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <main className="min-h-[200px] bg-afh-bg p-afh-5xl">
        <div className="mx-auto max-w-[600px]">
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
    min: -3000,
    max: 2025,
    value: 1200,
    onChange: () => {},
  },
} satisfies Meta<typeof ControlledTimeScrubber>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-101
export const Default430: Story = {
  name: "Default — 430 px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-101
export const Default720: Story = {
  name: "Default — 720 px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-101
export const Default800: Story = {
  name: "Default — 800 px",
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-101
export const AtBounds430: Story = {
  name: "At bounds (min) — 430 px",
  args: { value: -3000 },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-101
export const AtBounds720: Story = {
  name: "At bounds (min) — 720 px",
  args: { value: -3000 },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-101
export const AtBounds800: Story = {
  name: "At bounds (min) — 800 px",
  args: { value: -3000 },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-101
export const ReducedMotion430: Story = {
  name: "Reduced motion — 430 px",
  loaders: [reducedMotionLoader(true)],
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-101
export const ReducedMotion720: Story = {
  name: "Reduced motion — 720 px",
  loaders: [reducedMotionLoader(true)],
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-101
export const ReducedMotion800: Story = {
  name: "Reduced motion — 800 px",
  loaders: [reducedMotionLoader(true)],
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-101
export const Disabled430: Story = {
  name: "Disabled — 430 px",
  args: { disabled: true },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-101
export const Disabled720: Story = {
  name: "Disabled — 720 px",
  args: { disabled: true },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-101
export const Disabled800: Story = {
  name: "Disabled — 800 px",
  args: { disabled: true },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
