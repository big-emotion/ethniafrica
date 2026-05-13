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
  },
};

export default meta;
type Story = StoryObj<typeof ClassificationBadge>;

export const Consensual: Story = {
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
 * When `status` is null the component must return nothing — no placeholder,
 * no layout shift. This story verifies that contract.
 */
export const Null: Story = {
  name: "Null (renders nothing)",
  args: { status: null },
};
