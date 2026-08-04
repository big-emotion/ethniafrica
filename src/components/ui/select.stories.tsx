import type { Meta, StoryObj } from "@storybook/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56" aria-label="Famille linguistique">
        <SelectValue placeholder="Choisir une famille..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="flg_bantu">FLG_BANTU — Bantu</SelectItem>
        <SelectItem value="flg_nilotique">FLG_NILOTIQUE — Nilotique</SelectItem>
        <SelectItem value="flg_khoisan">FLG_KHOISAN — Khoïsan</SelectItem>
        <SelectItem value="flg_semitique">FLG_SEMITIQUE — Sémitique</SelectItem>
        <SelectItem value="flg_mande">FLG_MANDE — Mandé</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-64 space-y-2">
      <label htmlFor="select-famille" className="text-sm font-medium">
        Famille linguistique
      </label>
      <Select>
        <SelectTrigger id="select-famille" aria-label="Famille linguistique">
          <SelectValue placeholder="Sélectionner..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="flg_bantu">Bantu</SelectItem>
          <SelectItem value="flg_nilotique">Nilotique</SelectItem>
          <SelectItem value="flg_khoisan">Khoïsan</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger
        className="w-56"
        aria-label="Famille linguistique (non disponible)"
      >
        <SelectValue placeholder="Non disponible" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="x">X</SelectItem>
      </SelectContent>
    </Select>
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
    <Select>
      <SelectTrigger className="w-full" aria-label="Famille linguistique">
        <SelectValue placeholder="Choisir une famille..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="flg_bantu">FLG_BANTU — Bantu</SelectItem>
        <SelectItem value="flg_nilotique">FLG_NILOTIQUE — Nilotique</SelectItem>
      </SelectContent>
    </Select>
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
