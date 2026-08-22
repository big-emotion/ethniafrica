import type { Meta, StoryObj } from "@storybook/react";
import { QuizScoreCard } from "./QuizScoreCard";

const meta: Meta<typeof QuizScoreCard> = {
  title: "Quiz/QuizScoreCard",
  component: QuizScoreCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    a11y: { disable: false },
  },
  args: {
    playAgainHref: "/fr/quiz",
    onShare: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof QuizScoreCard>;

const fiches = [
  { id: "PPL_YORUBA", name: "Yoruba", href: "/fr/peuples/PPL_YORUBA" },
  { id: "PPL_IGBO", name: "Igbo", href: "/fr/peuples/PPL_IGBO" },
];

// @req REQ-103 FR70
export const LowScoreLockedRung: Story = {
  name: "Low score · rung not unlocked",
  args: {
    segment: "adults",
    correct: 3,
    total: 8,
    rung: 2,
    fiches,
  },
};

// @req REQ-103 FR70
export const HighScoreUnlockedRung: Story = {
  name: "High score · next rung unlocked",
  args: {
    segment: "professionals",
    correct: 9,
    total: 10,
    rung: 5,
    fiches,
  },
};

// @req REQ-103 FR70
export const NoFichesEncountered: Story = {
  name: "No fiches encountered (stateless share page)",
  args: {
    segment: "children",
    correct: 2,
    total: 5,
    rung: 1,
    fiches: [],
  },
};

// @req REQ-103 FR70
export const ShareStatusCopied: Story = {
  name: "Share status — link copied",
  args: {
    segment: "teens",
    correct: 6,
    total: 8,
    rung: 2,
    fiches,
    shareStatusMessage: "copié",
  },
};
