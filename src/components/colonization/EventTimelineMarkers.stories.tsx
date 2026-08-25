import type { Meta, StoryObj } from "@storybook/react";
import { EventTimelineMarkers } from "./EventTimelineMarkers";
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

const bounds = { min: 1850, max: 1907 };

const meta: Meta<typeof EventTimelineMarkers> = {
  title: "Colonization/EventTimelineMarkers",
  component: EventTimelineMarkers,
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
          "Epic-13-owned marker layer beside Epic 12's TimeScrubber (Epic 13, Story 13.12, " +
          "ETNI-536). TimeScrubber's own min/max/value/onChange ARIA-slider contract is " +
          "rendered unmodified; markers are an independently keyboard-focusable layer in DOM " +
          "order, each announcing 'événement {type}, {date}, {peuple} — Entrée pour ouvrir' " +
          "and opening an event card. Type filters are real checkboxes (accessible controls).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EventTimelineMarkers>;

// @req FR87
export const WithEvents: Story = {
  name: "Imposed name and resistance events",
  args: { events, bounds },
};

// @req FR90
export const NoEvents: Story = {
  name: "No events · filters and scrubber only",
  args: { events: [], bounds },
};
