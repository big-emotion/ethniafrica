import type { Meta, StoryObj } from "@storybook/react";
import { QuizAnswerReveal } from "./QuizAnswerReveal";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";

// Forces window.matchMedia('(prefers-reduced-motion: reduce)') to report
// `matches` for the story. Storybook `loaders` run before the story mounts
// and outside the component tree, so this is safe from render purity rules
// that a decorator (itself a component) would trip. Mirrors
// TimeScrubber.stories.tsx's reducedMotionLoader.
function reducedMotionLoader(matches: boolean) {
  return async () => {
    if (typeof window !== "undefined") {
      window.matchMedia = ((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" && matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;
    }
    return {};
  };
}

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

const meta: Meta<typeof QuizAnswerReveal> = {
  title: "Quiz/QuizAnswerReveal",
  component: QuizAnswerReveal,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: { viewports },
    a11y: { disable: false },
  },
};

export default meta;
type Story = StoryObj<typeof QuizAnswerReveal>;

const QUESTION: QuizSessionQuestionView = {
  id: "q-1",
  templateId: "T2",
  promptFr: "Quelle est l'auto-appellation de ce peuple ?",
  optionsFr: ["Alpha", "Beta", "Gamma", "Delta"],
  correctOption: 2,
  explanationFr: "Gamma est confirmé par la source primaire.",
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

// @req REQ-103 FR68 FR71
export const IncorrectMobile430: Story = {
  name: "Incorrect verdict · 430 px",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: false,
    onNext: () => {},
  },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-103 FR68 FR71
export const IncorrectTablet720: Story = {
  name: "Incorrect verdict · 720 px",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: false,
    onNext: () => {},
  },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-103 FR68 FR71
export const IncorrectDesktop800: Story = {
  name: "Incorrect verdict · 800 px",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: false,
    onNext: () => {},
  },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-103 FR68
export const CorrectMobile430: Story = {
  name: "Correct verdict · 430 px",
  args: {
    question: QUESTION,
    isCorrect: true,
    isLastQuestion: false,
    onNext: () => {},
  },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-103 FR68
export const CorrectTablet720: Story = {
  name: "Correct verdict · 720 px",
  args: {
    question: QUESTION,
    isCorrect: true,
    isLastQuestion: false,
    onNext: () => {},
  },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-103 FR68
export const CorrectDesktop800: Story = {
  name: "Correct verdict · 800 px",
  args: {
    question: QUESTION,
    isCorrect: true,
    isLastQuestion: false,
    onNext: () => {},
  },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-103 NFR — reduced-motion
export const ReducedMotionMobile430: Story = {
  name: "Reduced motion · 430 px",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: false,
    onNext: () => {},
  },
  loaders: [reducedMotionLoader(true)],
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req REQ-103 NFR — reduced-motion
export const ReducedMotionTablet720: Story = {
  name: "Reduced motion · 720 px",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: false,
    onNext: () => {},
  },
  loaders: [reducedMotionLoader(true)],
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req REQ-103 NFR — reduced-motion
export const ReducedMotionDesktop800: Story = {
  name: "Reduced motion · 800 px",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: false,
    onNext: () => {},
  },
  loaders: [reducedMotionLoader(true)],
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req REQ-103 FR67
export const LastQuestion: Story = {
  name: "Last question (« voir le score »)",
  args: {
    question: QUESTION,
    isCorrect: false,
    isLastQuestion: true,
    onNext: () => {},
  },
};
