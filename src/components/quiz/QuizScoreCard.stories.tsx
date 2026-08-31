import type { Meta, StoryObj } from "@storybook/react";
import { QuizScoreCard } from "./QuizScoreCard";
import { getLocalizedRoute, getPeopleRoute } from "@/lib/routing";

const meta: Meta<typeof QuizScoreCard> = {
  title: "Quiz/QuizScoreCard",
  component: QuizScoreCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    a11y: { disable: false },
  },
  args: {
    playAgainHref: getLocalizedRoute("fr", "quiz"),
    onShare: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof QuizScoreCard>;

const fiches = [
  {
    id: "PPL_YORUBA",
    name: "Yoruba",
    href: getPeopleRoute("fr", "PPL_YORUBA"),
  },
  { id: "PPL_IGBO", name: "Igbo", href: getPeopleRoute("fr", "PPL_IGBO") },
];

// @req REQ-103 FR70
export const LowScore: Story = {
  name: "Low score · country track",
  args: {
    scopeLabelFr: "Ghana",
    correct: 3,
    total: 8,
    fiches,
  },
};

// @req REQ-103 FR70
export const HighScore: Story = {
  name: "High score · family track",
  args: {
    scopeLabelFr: "Nigéro-congolaise",
    correct: 9,
    total: 10,
    fiches,
  },
};

// @req REQ-103 FR70
export const NoFichesEncountered: Story = {
  name: "No fiches encountered (stateless share page)",
  args: {
    scopeLabelFr: "Khoïsan",
    correct: 2,
    total: 5,
    fiches: [],
  },
};

// @req REQ-103 FR70
export const ShareStatusCopied: Story = {
  name: "Share status — link copied",
  args: {
    scopeLabelFr: "Tout le continent",
    correct: 6,
    total: 8,
    fiches,
    shareStatusMessage: "copié",
  },
};
