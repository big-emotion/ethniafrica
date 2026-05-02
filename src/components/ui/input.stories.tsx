import type { Meta, StoryObj } from "@storybook/react";
import { Search } from "lucide-react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "search", "number"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Rechercher un peuple...",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-72 space-y-2">
      <label className="text-sm font-medium">Nom du peuple</label>
      <Input placeholder="ex: Yoruba, Zulu, Akan..." />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: "Champ désactivé",
    disabled: true,
    value: "FLG_BANTU",
  },
};

export const WithError: Story = {
  render: () => (
    <div className="w-72 space-y-2">
      <label className="text-sm font-medium">Code peuple</label>
      <Input
        placeholder="PPL_xxxxx"
        className="border-destructive focus-visible:ring-destructive"
        defaultValue="PPL_invalid"
      />
      <p className="text-sm text-destructive">
        Format invalide. Utilisez PPL_ suivi de lettres majuscules.
      </p>
    </div>
  ),
};

export const SearchField: Story = {
  render: () => (
    <div className="relative w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input className="pl-9" placeholder="Rechercher..." />
    </div>
  ),
};
