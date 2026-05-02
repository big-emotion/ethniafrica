import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
  title: "UI/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <p className="text-sm">Famille Linguistique</p>
      <Separator className="my-2" />
      <p className="text-sm text-muted-foreground">
        Bantu · Niger-Congo · Afrique subsaharienne
      </p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center gap-4 h-8">
      <span className="text-sm">FLG_BANTU</span>
      <Separator orientation="vertical" />
      <span className="text-sm">PPL_ZULU</span>
      <Separator orientation="vertical" />
      <span className="text-sm">ZAF</span>
    </div>
  ),
};
