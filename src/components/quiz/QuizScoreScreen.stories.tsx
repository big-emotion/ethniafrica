import type { Meta, StoryObj } from "@storybook/react";
import { QuizScoreScreen } from "./QuizScoreScreen";

const meta: Meta<typeof QuizScoreScreen> = {
  title: "Quiz/QuizScoreScreen",
  component: QuizScoreScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: { disable: false } },
};

export default meta;
type Story = StoryObj<typeof QuizScoreScreen>;

// @req REQ-103 FR70
export const CountryTrack: Story = {
  name: "Country track",
  args: {
    scope: { kind: "country", entityId: "GHA" },
    scopeLabelFr: "Ghana",
    correctCount: 7,
    totalQuestions: 8,
    exitHref: "/fr/quiz",
  },
};

// @req REQ-103 FR70
export const WholeCorpusTrack: Story = {
  name: "Whole-corpus track",
  args: {
    scope: { kind: "mixed" },
    scopeLabelFr: "Tout le continent",
    correctCount: 4,
    totalQuestions: 8,
    exitHref: "/fr/quiz",
  },
};
