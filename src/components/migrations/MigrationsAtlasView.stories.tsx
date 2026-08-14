import type { Meta, StoryObj } from "@storybook/react";
import { MigrationsAtlasView } from "./MigrationsAtlasView";

const meta: Meta<typeof MigrationsAtlasView> = {
  title: "Migrations/MigrationsAtlasView",
  component: MigrationsAtlasView,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof MigrationsAtlasView>;

/**
 * The map itself ships in Story 12.9 — until then this shell renders a
 * static placeholder so the "Carte" tab is never empty.
 */
export const Placeholder: Story = {};
