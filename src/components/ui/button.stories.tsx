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
