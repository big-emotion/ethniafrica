import type { Meta, StoryObj } from "@storybook/react";
import { QuizSegmentPicker } from "./QuizSegmentPicker";
import type { QuizSegmentView } from "@/api/v2/schemas/quiz";

// Mirrors the sibling ComparisonView.stories.tsx viewport set — the three
// project breakpoints exercised by the AC4 axe-core proof (ETNI-497).
const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "700px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "700px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "700px" },
  },
};

const meta: Meta<typeof QuizSegmentPicker> = {
  title: "Quiz/QuizSegmentPicker",
  component: QuizSegmentPicker,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
  },
};

export default meta;
type Story = StoryObj<typeof QuizSegmentPicker>;

// @req REQ-103 FR66
const allAvailableSegments: QuizSegmentView[] = [
  {
    id: "children",
    labelFr: "enfants",
    rungs: [{ difficulty: 1, activeQuestionCount: 6 }],
  },
  {
    id: "teens",
    labelFr: "ados",
    rungs: [{ difficulty: 2, activeQuestionCount: 8 }],
  },
  {
    id: "adults",
    labelFr: "adultes",
    rungs: [{ difficulty: 3, activeQuestionCount: 10 }],
  },
  {
    id: "university",
    labelFr: "étudiants",
    rungs: [{ difficulty: 4, activeQuestionCount: 7 }],
  },
  {
    id: "professionals",
    labelFr: "professionnels",
    rungs: [{ difficulty: 5, activeQuestionCount: 5 }],
  },
];

// @req REQ-103 FR43
const withZeroQuestionSegment: QuizSegmentView[] = [
  {
    id: "children",
    labelFr: "enfants",
    rungs: [{ difficulty: 1, activeQuestionCount: 6 }],
  },
  {
    id: "teens",
    labelFr: "ados",
    rungs: [{ difficulty: 2, activeQuestionCount: 0 }],
  },
  {
    id: "adults",
    labelFr: "adultes",
    rungs: [{ difficulty: 3, activeQuestionCount: 10 }],
  },
  {
    id: "university",
    labelFr: "étudiants",
    rungs: [{ difficulty: 4, activeQuestionCount: 7 }],
  },
  {
    id: "professionals",
    labelFr: "professionnels",
    rungs: [{ difficulty: 5, activeQuestionCount: 5 }],
  },
];

// @req REQ-103 FR66
export const AllAvailableMobile430: Story = {
  name: "All available · 430 px",
  args: { segments: allAvailableSegments },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-103 FR66
export const AllAvailableTablet720: Story = {
  name: "All available · 720 px",
  args: { segments: allAvailableSegments },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-103 FR66
export const AllAvailableDesktop800: Story = {
  name: "All available · 800 px",
  args: { segments: allAvailableSegments },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-103 FR43
export const ZeroQuestionSegmentMobile430: Story = {
  name: "Zero-question segment (calm state) · 430 px",
  args: { segments: withZeroQuestionSegment },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-103 FR43
export const ZeroQuestionSegmentTablet720: Story = {
  name: "Zero-question segment (calm state) · 720 px",
  args: { segments: withZeroQuestionSegment },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-103 FR43
export const ZeroQuestionSegmentDesktop800: Story = {
  name: "Zero-question segment (calm state) · 800 px",
  args: { segments: withZeroQuestionSegment },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
