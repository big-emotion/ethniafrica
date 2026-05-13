import type { Meta, StoryObj } from "@storybook/react";
import { ClassificationBadge } from "./classification-badge";

const meta: Meta<typeof ClassificationBadge> = {
  title: "UI/ClassificationBadge",
  component: ClassificationBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    status: {
      control: "select",
      options: [
        "consensual",
        "contested",
        "colonial-legacy",
        "reconstructive",
        null,
      ],
    },
    doctrineSlug: {
      control: "text",
      description:
        "Slug of an adjacent DoctrineLinkCard. The badge exposes it via " +
        "data-doctrine-slug; rendering the card is the caller's job.",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClassificationBadge>;

/**
 * `consensual` is the default editorial state — the component intentionally
 * returns `null` so we don't pollute fiches with low-signal badges. This
 * story documents that contract.
 */
export const Consensual: Story = {
  name: "Consensual (renders nothing)",
  args: { status: "consensual" },
};

export const Contested: Story = {
  args: { status: "contested" },
};

export const ColonialLegacy: Story = {
  name: "Colonial legacy",
  args: { status: "colonial-legacy" },
};

export const Reconstructive: Story = {
  args: { status: "reconstructive" },
};

/**
 * When `status` is null the component returns nothing — no placeholder,
 * no layout shift. This story verifies that contract.
 */
export const Null: Story = {
  name: "Null (renders nothing)",
  args: { status: null },
};

/**
 * Shows the badge paired with a `doctrineSlug`. The slug surfaces as
 * `data-doctrine-slug` on the link so an adjacent `DoctrineLinkCard` can
 * find it; the badge itself does not render the card.
 */
export const WithDoctrineSlug: Story = {
  name: "With doctrineSlug (caller renders the card)",
  args: { status: "contested", doctrineSlug: "classification-status" },
};

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions.
//
// We render the badge inside a fixed-width frame so the story preview shows
// how it sits in different viewport widths. The badge itself is intrinsic;
// the frame mimics the page container at each breakpoint.
// ---------------------------------------------------------------------------

const Frame = ({
  width,
  label,
  children,
}: {
  width: number;
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      width,
      maxWidth: "100%",
      border: "1px dashed rgba(0,0,0,0.15)",
      borderRadius: 8,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      background: "white",
    }}
  >
    <div
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        fontSize: 12,
        color: "#666",
      }}
    >
      {label} — {width}px
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
  </div>
);

const AllStatuses = () => (
  <>
    <ClassificationBadge status="contested" />
    <ClassificationBadge status="colonial-legacy" />
    <ClassificationBadge status="reconstructive" />
  </>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={430} label="Mobile">
      <AllStatuses />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={720} label="Tablet">
      <AllStatuses />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={800} label="Desktop (country max-width)">
      <AllStatuses />
    </Frame>
  ),
};

export const DesktopWide1024: Story = {
  name: "Breakpoint — Desktop wide (1024px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={1024} label="Desktop wide">
      <AllStatuses />
    </Frame>
  ),
};
