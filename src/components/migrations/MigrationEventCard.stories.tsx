import type { Meta, StoryObj } from "@storybook/react";
import { MigrationEventCard } from "./MigrationEventCard";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";

const baseEvent: MigrationNarrativeEntry = {
  id: "MGR_BANTU_PHASE_1",
  nameMain: "Expansion bantoue — phase 1",
  migrationGroup: null,
  eventType: "expansion",
  classificationStatus: "consensual",
  timeRange: { startYear: -2000, endYear: -1000, datingNote: null },
  peoples: [
    { id: "PPL_BANTU_CORE", nameMain: "Peuples bantous", role: "origin" },
  ],
  paragraphs: [],
  debate: null,
  sourceCount: 2,
};

const meta: Meta<typeof MigrationEventCard> = {
  title: "Migrations/MigrationEventCard",
  component: MigrationEventCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof MigrationEventCard>;

export const Consensual: Story = {
  name: "Consensual (no badge)",
  args: { event: baseEvent },
};

export const Contested: Story = {
  args: {
    event: {
      ...baseEvent,
      id: "MGR_CONTESTED",
      nameMain: "Peuplement disputé",
      classificationStatus: "contested",
    },
  },
};

/**
 * When `migrationGroup` is set, the card surfaces a phase indicator so
 * readers understand this event is one leg of a larger macro-migration.
 */
export const WithMigrationPhase: Story = {
  name: "With migration phase (migrationGroup set)",
  args: {
    event: { ...baseEvent, migrationGroup: "bantu-expansion" },
  },
};

export const WithFullConfidence: Story = {
  name: "Full confidence pill",
  args: {
    event: baseEvent,
    confidence: { score: 90, sourceCount: 4, lastHumanAuditAt: "2026-02-01" },
  },
};

/**
 * No confidence payload — the shared ConfidenceChip degrades to a
 * "voir les sources" link rather than showing a broken/empty pill.
 */
export const NoConfidenceData: Story = {
  name: "No confidence data (degraded link)",
  args: { event: baseEvent, confidence: null },
};

export const NoPeoples: Story = {
  name: "No linked peoples (graceful degradation)",
  args: { event: { ...baseEvent, peoples: [] } },
};

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions.
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
      background: "white",
    }}
  >
    <div
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        fontSize: 12,
        color: "#666",
        marginBottom: 12,
      }}
    >
      {label} — {width}px
    </div>
    {children}
  </div>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  render: () => (
    <Frame width={430} label="Mobile">
      <MigrationEventCard
        event={{ ...baseEvent, migrationGroup: "bantu-expansion" }}
        confidence={{
          score: 90,
          sourceCount: 4,
          lastHumanAuditAt: "2026-02-01",
        }}
      />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  render: () => (
    <Frame width={720} label="Tablet">
      <MigrationEventCard
        event={{ ...baseEvent, migrationGroup: "bantu-expansion" }}
        confidence={{
          score: 90,
          sourceCount: 4,
          lastHumanAuditAt: "2026-02-01",
        }}
      />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  render: () => (
    <Frame width={800} label="Desktop (country max-width)">
      <MigrationEventCard
        event={{ ...baseEvent, migrationGroup: "bantu-expansion" }}
        confidence={{
          score: 90,
          sourceCount: 4,
          lastHumanAuditAt: "2026-02-01",
        }}
      />
    </Frame>
  ),
};
