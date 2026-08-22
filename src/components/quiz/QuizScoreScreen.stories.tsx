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

// @req REQ-103 FR68
export const RungAdvanced: Story = {
  name: "≥ 75 % correct (rung advances)",
  args: {
    segment: "adults",
    difficulty: 2,
    correctCount: 7,
    totalQuestions: 8,
    onPlayAgain: () => {},
  },
};

// @req REQ-103 FR68
export const RungNotAdvanced: Story = {
  name: "< 75 % correct (rung unchanged)",
  args: {
    segment: "adults",
    difficulty: 2,
    correctCount: 4,
    totalQuestions: 8,
    onPlayAgain: () => {},
  },
};
