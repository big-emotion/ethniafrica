import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { QuizQuestionCard } from "./QuizQuestionCard";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";

// Mirrors the sibling QuizSegmentPicker.stories.tsx viewport set — the three
// project breakpoints exercised by the axe-core proof (ETNI-497/ETNI-498).
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

const meta: Meta<typeof QuizQuestionCard> = {
  title: "Quiz/QuizQuestionCard",
  component: QuizQuestionCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
  },
};

export default meta;
type Story = StoryObj<typeof QuizQuestionCard>;

const QUESTION: QuizSessionQuestionView = {
  id: "q-1",
  templateId: "T2",
  promptFr: "Quelle est l'auto-appellation de ce peuple ?",
  optionsFr: ["Alpha", "Beta", "Gamma", "Delta"],
  correctOption: 2,
  explanationFr: "Explication.",
  source: { title: "SIL Ethnologue", year: 2021, tier: "official", url: null },
  assertionId: "assertion-1",
  entity: {
    type: "people",
    id: "PPL_TEST",
    slug: "PPL_TEST",
    autonym: null,
    exonym: null,
  },
};

function InteractiveCard() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <QuizQuestionCard
      question={QUESTION}
      selectedOption={selected}
      onSelectOption={setSelected}
      onValidate={() => {}}
    />
  );
}

// @req REQ-103 FR67
export const AnsweringMobile430: Story = {
  name: "Answering · 430 px",
  render: () => <InteractiveCard />,
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-103 FR67
export const AnsweringTablet720: Story = {
  name: "Answering · 720 px",
  render: () => <InteractiveCard />,
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-103 FR67
export const AnsweringDesktop800: Story = {
  name: "Answering · 800 px",
  render: () => <InteractiveCard />,
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
