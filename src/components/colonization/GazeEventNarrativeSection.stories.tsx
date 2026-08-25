import type { Meta, StoryObj } from "@storybook/react";
import { GazeEventNarrativeSection } from "./GazeEventNarrativeSection";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "900px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "900px" },
  },
};

const consensualDisplacement: MigrationNarrativeEntry = {
  id: "MGR_DISPLACEMENT_EXAMPLE",
  nameMain: "Déplacement forcé illustratif",
  migrationGroup: null,
  eventType: "displacement",
  classificationStatus: "consensual",
  timeRange: { startYear: 1898, endYear: 1901, datingNote: null },
  peoples: [{ id: "PPL_EXAMPLE", nameMain: "Peuple illustratif", role: null }],
  paragraphs: [
    {
      text: "Un déplacement forcé documenté, illustratif du corpus sourcé de l'Épopée 13.",
      confidence: { score: 88, sourceCount: 3, lastHumanAuditAt: "2026-02-01" },
    },
  ],
  debate: null,
  sourceCount: 3,
};

const contestedResistance: MigrationNarrativeEntry = {
  id: "MGR_MAJI_MAJI_REBELLION",
  nameMain: "Rébellion Maji Maji contre l'administration coloniale allemande",
  migrationGroup: null,
  eventType: "resistance",
  classificationStatus: "contested",
  timeRange: {
    startYear: 1905,
    endYear: 1907,
    datingNote:
      "L'ampleur du bilan humain reste débattue selon les sources historiographiques.",
  },
  peoples: [
    { id: "PPL_MATUMBI", nameMain: "Matumbi", role: "resistance" },
    { id: "PPL_NGONI", nameMain: "Ngoni", role: "resistance" },
  ],
  paragraphs: [
    {
      text: "Le soulèvement débute dans la vallée du Rufiji comme une protestation paysanne contre le régime de culture obligatoire du coton imposé par l'administration coloniale allemande.",
      confidence: { score: 82, sourceCount: 2, lastHumanAuditAt: "2026-01-15" },
    },
  ],
  debate:
    "Les estimations du nombre de victimes de la répression (entre 75 000 et 300 000 morts, principalement par famine) varient fortement selon les sources et continuent de faire l'objet de débats historiographiques.",
  sourceCount: 2,
};

const meta: Meta<typeof GazeEventNarrativeSection> = {
  title: "Colonization/GazeEventNarrativeSection",
  component: GazeEventNarrativeSection,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "Chronological narrative cards for displacement/resistance events (FR87, FR89, FR90 — " +
          "Epic 13, Story 13.11). Each card shows date, affected peoples (endonym-first), prose " +
          "with a ConfidenceChip per paragraph (Direction D), and a ClassificationBadge when not " +
          "consensual. Contested events expand a multi-perspective debate block, and a " +
          "DoctrineLinkCard appears in the section footer whenever any event is not consensual. " +
          "Renders a calm empty state (UX-DR31) when the corpus has zero surviving entries.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GazeEventNarrativeSection>;

// @req REQ-101
export const Displacement: Story = {
  name: "Déplacements forcés · consensuel",
  args: {
    eventType: "displacement",
    events: [consensualDisplacement],
    title: "Déplacements forcés",
  },
};

// @req REQ-101
export const ResistanceContested: Story = {
  name: "Résistances · événement contesté",
  args: {
    eventType: "resistance",
    events: [contestedResistance],
    title: "Résistances",
  },
};

// @req REQ-101
export const MultipleEvents: Story = {
  name: "Résistances · plusieurs événements",
  args: {
    eventType: "resistance",
    events: [
      { ...consensualDisplacement, id: "MGR_FIRST", eventType: "resistance" },
      contestedResistance,
    ],
    title: "Résistances",
  },
};

// @req REQ-101
export const EmptyDisplacement: Story = {
  name: "Déplacements forcés · état vide",
  args: {
    eventType: "displacement",
    events: [],
    title: "Déplacements forcés",
  },
};

// @req REQ-101
export const EmptyResistance: Story = {
  name: "Résistances · état vide",
  args: {
    eventType: "resistance",
    events: [],
    title: "Résistances",
  },
};

// @req REQ-101
export const Mobile430: Story = {
  name: "Breakpoint · 430 px",
  args: {
    eventType: "resistance",
    events: [contestedResistance],
    title: "Résistances",
  },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-101
export const Tablet720: Story = {
  name: "Breakpoint · 720 px",
  args: {
    eventType: "resistance",
    events: [contestedResistance],
    title: "Résistances",
  },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-101
export const Desktop800: Story = {
  name: "Breakpoint · 800 px",
  args: {
    eventType: "resistance",
    events: [contestedResistance],
    title: "Résistances",
  },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
