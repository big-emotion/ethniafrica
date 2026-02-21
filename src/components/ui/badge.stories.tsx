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
