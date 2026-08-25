import type { Meta, StoryObj } from "@storybook/react";
import { EventChronologyTable } from "./EventChronologyTable";
import type { ColonizationTimelineEntry } from "@/lib/colonizationDataTransformer";

const events: ColonizationTimelineEntry[] = [
  {
    id: "MGR_YORUBA_NAGO_COLONIAL_EXONYM",
    nameMain: "Exonyme colonial « Nago »",
    eventType: "imposed_name",
    classificationStatus: "colonial-legacy",
    timeRange: { startYear: 1850, endYear: 1850, datingNote: null },
    peoples: [
      {
        id: "PPL_YORUBA",
        nameMain: "Yoruba",
        endonym: "Yorùbá",
        endonymLanguage: "yor",
      },
    ],
    place: null,
    primarySource: null,
  },
  {
    id: "MGR_MAJI_MAJI_REBELLION",
    nameMain: "Rébellion Maji Maji",
    eventType: "resistance",
    classificationStatus: "contested",
    timeRange: { startYear: 1905, endYear: 1907, datingNote: null },
    peoples: [
      {
        id: "PPL_MATUMBI",
        nameMain: "Matumbi",
        endonym: "Matumbi",
        endonymLanguage: "mgw",
      },
      {
        id: "PPL_NGONI",
        nameMain: "Ngoni",
        endonym: null,
        endonymLanguage: null,
      },
    ],
    place: null,
    primarySource: {
      title: "UNESCO General History of Africa",
      url: "https://example.org/unesco",
    },
  },
];

const meta: Meta<typeof EventChronologyTable> = {
  title: "Colonization/EventChronologyTable",
  component: EventChronologyTable,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    a11y: {
      test: "error",
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      },
    },
    docs: {
      description: {
        component:
          "Text-first equivalent of EventTimelineMarkers (Epic 13, Story 13.12, ETNI-536) — " +
          "a semantic table always in the DOM, server-rendered, works with or without JS. " +
          "`place` renders 'Non documenté' unconditionally: the migration_events data model " +
          "has no location field yet.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EventChronologyTable>;

// @req FR87
export const WithEvents: Story = {
  name: "Imposed name and resistance events",
  args: { events },
};

// @req FR90
export const NoEvents: Story = {
  name: "No events · header only",
  args: { events: [] },
};
