import type { Meta, StoryObj } from "@storybook/react";
import { MapPin, Download, Search } from "lucide-react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Explorer les peuples",
    variant: "default",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Default (Terracotta)</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Petit</Button>
      <Button size="default">Normal</Button>
      <Button size="lg">Grand</Button>
      <Button size="icon" aria-label="Rechercher">
        <Search />
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: "Indisponible",
    disabled: true,
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>
        <MapPin /> Localiser
      </Button>
      <Button variant="outline">
        <Download /> Télécharger CSV
      </Button>
      <Button variant="secondary">
        <Search /> Rechercher
      </Button>
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
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

const AllButtons = () => (
  <>
    <Button>Voir la fiche</Button>
    <Button size="lg">Explorer</Button>
    <Button size="icon" aria-label="Rechercher">
      <Search />
    </Button>
  </>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={430} label="Mobile">
      <AllButtons />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={720} label="Tablet">
      <AllButtons />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={800} label="Desktop">
      <AllButtons />
    </Frame>
  ),
};
