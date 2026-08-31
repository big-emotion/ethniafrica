import type { Meta, StoryObj } from "@storybook/react";
import { QuizProgressDots } from "./QuizProgressDots";

const meta: Meta<typeof QuizProgressDots> = {
  title: "Quiz/QuizProgressDots",
  component: QuizProgressDots,
  tags: ["autodocs"],
  parameters: { layout: "centered", a11y: { disable: false } },
};

export default meta;
type Story = StoryObj<typeof QuizProgressDots>;

// @req REQ-103 FR67
export const MidSession: Story = {
  args: { current: 3, total: 8 },
};

// @req REQ-103 FR67
export const FirstQuestion: Story = {
  args: { current: 1, total: 8 },
};

// @req REQ-103 FR67
export const LastQuestion: Story = {
  args: { current: 8, total: 8 },
};
