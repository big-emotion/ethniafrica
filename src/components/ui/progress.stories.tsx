import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 60 },
  render: (args) => (
    <Progress {...args} className="w-64" aria-label="Progression" />
  ),
};

export const AllValues: Story = {
  render: () => (
    <div className="w-64 space-y-4">
      {[
        { label: "Yoruba (NGA)", value: 21 },
        { label: "Hausa (NGA)", value: 15 },
        { label: "Igbo (NGA)", value: 11 },
        { label: "Ijaw (NGA)", value: 4 },
      ].map(({ label, value }) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{label}</span>
            <span className="text-muted-foreground">{value}%</span>
          </div>
          <Progress value={value} aria-label={label} />
        </div>
      ))}
    </div>
  ),
};

export const Zero: Story = {
  args: { value: 0 },
  render: (args) => (
    <Progress {...args} className="w-64" aria-label="Progression" />
  ),
};

export const Full: Story = {
  args: { value: 100 },
  render: (args) => (
    <Progress {...args} className="w-64" aria-label="Progression" />
  ),
};
