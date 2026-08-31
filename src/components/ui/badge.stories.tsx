import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Famille Bantu",
    variant: "default",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const ContextAfrik: Story = {
  name: "Contexte AFRIK",
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground w-full">
          Familles linguistiques :
        </span>
        <Badge variant="default">FLG_BANTU</Badge>
        <Badge variant="default">FLG_NILOTIQUE</Badge>
        <Badge variant="default">FLG_KHOISAN</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground w-full">Peuples :</span>
        <Badge variant="secondary">PPL_YORUBA</Badge>
        <Badge variant="secondary">PPL_ZULU</Badge>
        <Badge variant="secondary">PPL_AKAN</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground w-full">Pays :</span>
        <Badge variant="outline">ZAF</Badge>
        <Badge variant="outline">NGA</Badge>
        <Badge variant="outline">COM</Badge>
      </div>
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
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const AllBadges = () => (
  <>
    <Badge variant="default">FLG_BANTU</Badge>
    <Badge variant="secondary">PPL_YORUBA</Badge>
    <Badge variant="outline">ZAF</Badge>
    <Badge variant="destructive">Supprimé</Badge>
  </>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={430} label="Mobile">
      <AllBadges />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={720} label="Tablet">
      <AllBadges />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={800} label="Desktop">
      <AllBadges />
    </Frame>
  ),
};
