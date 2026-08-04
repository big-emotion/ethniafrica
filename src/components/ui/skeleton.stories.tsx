import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

export const PeopleCard: Story = {
  name: "People Card (loading)",
  render: () => (
    <div className="rounded-lg border bg-card p-6 w-72 space-y-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  ),
};

export const ListItems: Story = {
  name: "Liste (loading)",
  render: () => (
    <div className="w-80 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions (ETNI-799 R5).
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
    <div style={{ fontSize: 12, color: "#666" }}>
      {label} — {width}px
    </div>
    {children}
  </div>
);

const SkeletonStack = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={430} label="Mobile">
      <SkeletonStack />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={720} label="Tablet">
      <SkeletonStack />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={800} label="Desktop">
      <SkeletonStack />
    </Frame>
  ),
};
