import type { Meta, StoryObj } from "@storybook/react";
import { type ComponentProps, useState } from "react";
import { CompareShareBar } from "./CompareShareBar";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "400px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "400px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "400px" },
  },
};

const meta: Meta<typeof CompareShareBar> = {
  title: "Compare/CompareShareBar",
  component: CompareShareBar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
  },
  argTypes: {
    canonicalUrl: { control: "text" },
    title: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof CompareShareBar>;

const defaultArgs = {
  canonicalUrl:
    "https://ethniafrica.example/fr/comparer/peoples/PPL_YORUBA/PPL_ASHANTI",
  title: "Comparaison : Yoruba · Ashanti",
};

function withStubbedNavigator(
  props: ComponentProps<typeof CompareShareBar>,
  configure: (nav: Navigator) => void
) {
  function Stubbed() {
    const [ready] = useState(() => {
      if (typeof navigator === "undefined") return false;
      configure(navigator);
      return true;
    });

    if (!ready) return null;
    return <CompareShareBar {...props} />;
  }
  return <Stubbed />;
}

// @req REQ-100
export const NativeShareMobile430: Story = {
  name: "Native share · 430 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: async () => {},
      });
    }),
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-100
export const NativeShareTablet720: Story = {
  name: "Native share · 720 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: async () => {},
      });
    }),
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-100
export const NativeShareDesktop800: Story = {
  name: "Native share · 800 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: async () => {},
      });
    }),
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-100
export const CopyLinkMobile430: Story = {
  name: "Copy link (no Web Share) · 430 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(nav, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
    }),
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-100
export const CopyLinkTablet720: Story = {
  name: "Copy link (no Web Share) · 720 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(nav, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
    }),
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-100
export const CopyLinkDesktop800: Story = {
  name: "Copy link (no Web Share) · 800 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(nav, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
    }),
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-100
export const CopyDeniedMobile430: Story = {
  name: "Copy denied · manual selection · 430 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(nav, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("permission denied");
          },
        },
      });
    }),
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-100
export const CopyDeniedTablet720: Story = {
  name: "Copy denied · manual selection · 720 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(nav, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("permission denied");
          },
        },
      });
    }),
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-100
export const CopyDeniedDesktop800: Story = {
  name: "Copy denied · manual selection · 800 px",
  args: defaultArgs,
  render: (args) =>
    withStubbedNavigator(args, (nav) => {
      Object.defineProperty(nav, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(nav, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("permission denied");
          },
        },
      });
    }),
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
