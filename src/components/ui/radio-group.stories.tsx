import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta: Meta<typeof RadioGroup> = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="fr" className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="fr" aria-label="Français" />
        Français
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="en" aria-label="English" />
        English
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="es" aria-label="Español" />
        Español
      </label>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="fr" disabled className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="fr" aria-label="Français" />
        Français
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="en" aria-label="English" />
        English
      </label>
    </RadioGroup>
  ),
};

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions (ETNI-799 R5).
// ---------------------------------------------------------------------------

const Frame = ({ width, label }: { width: number; label: string }) => (
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
    <RadioGroup defaultValue="fr" className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="fr" aria-label="Français" />
        Français
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="en" aria-label="English" />
        English
      </label>
    </RadioGroup>
  </div>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => <Frame width={430} label="Mobile" />,
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => <Frame width={720} label="Tablet" />,
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => <Frame width={800} label="Desktop" />,
};
