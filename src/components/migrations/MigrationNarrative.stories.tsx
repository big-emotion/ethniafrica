import type { Meta, StoryObj } from "@storybook/react";
import { MigrationNarrative } from "./MigrationNarrative";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";

const bantuPhase1: MigrationNarrativeEntry = {
  id: "MGR_BANTU_PHASE_1",
  nameMain: "Expansion bantoue — phase 1",
  migrationGroup: "bantu-expansion",
  eventType: "expansion",
  classificationStatus: "consensual",
  timeRange: { startYear: -2000, endYear: -1000, datingNote: null },
  peoples: [
    { id: "PPL_BANTU_CORE", nameMain: "Peuples bantous", role: "origin" },
  ],
  paragraphs: [
    {
      text: "La première phase de l'expansion bantoue débute dans la région frontalière du Cameroun et du Nigeria.",
      confidence: { score: 82, sourceCount: 5, lastHumanAuditAt: "2026-01-10" },
    },
    {
      text: "Les locuteurs proto-bantous se déplacent progressivement vers le sud et l'est du continent.",
      confidence: { score: 82, sourceCount: 5, lastHumanAuditAt: "2026-01-10" },
    },
  ],
  debate: null,
  sourceCount: 5,
};

const contestedEvent: MigrationNarrativeEntry = {
  id: "MGR_CONTESTED",
  nameMain: "Peuplement disputé",
  migrationGroup: null,
  eventType: "trade_route",
  classificationStatus: "contested",
  timeRange: {
    startYear: 800,
    endYear: 1200,
    datingNote: "datation incertaine",
  },
  peoples: [
    { id: "PPL_SWAHILI", nameMain: "Peuple Swahili", role: "destination" },
  ],
  paragraphs: [
    {
      text: "Le peuplement de la côte swahilie fait l'objet de débats historiographiques.",
      confidence: null,
    },
  ],
  debate:
    "Les historiens ne s'accordent pas sur la datation exacte du premier peuplement, certaines sources archéologiques suggérant une chronologie plus ancienne.",
  sourceCount: 3,
};

const meta: Meta<typeof MigrationNarrative> = {
  title: "Migrations/MigrationNarrative",
  component: MigrationNarrative,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof MigrationNarrative>;

// @req REQ-101
export const FullNarrative: Story = {
  name: "Full narrative (multiple events)",
  args: { language: "fr", events: [bantuPhase1, contestedEvent] },
};

// @req REQ-101
export const ContestedWithDebate: Story = {
  name: "Contested event with debate text",
  args: { language: "fr", events: [contestedEvent] },
};

// @req REQ-101
export const EmptyState: Story = {
  name: "Empty state (no events)",
  args: { language: "fr", events: [] },
};

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

// @req REQ-101
export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  render: () => (
    <Frame width={430} label="Mobile">
      <MigrationNarrative language="fr" events={[bantuPhase1]} />
    </Frame>
  ),
};

// @req REQ-101
export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  render: () => (
    <Frame width={800} label="Desktop (country max-width)">
      <MigrationNarrative language="fr" events={[bantuPhase1]} />
    </Frame>
  ),
};
