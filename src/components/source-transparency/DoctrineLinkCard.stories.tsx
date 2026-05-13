import type { Meta, StoryObj } from "@storybook/react";
import { DoctrineLinkCard } from "./DoctrineLinkCard";

const meta: Meta<typeof DoctrineLinkCard> = {
  title: "Source Transparency/DoctrineLinkCard",
  component: DoctrineLinkCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    slug: {
      control: "select",
      options: [
        "endonymes-vs-exonymes",
        "classifications-contestees",
        "heritage-colonial",
        "topics-sensibles",
      ],
    },
    version: {
      control: { type: "number", min: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DoctrineLinkCard>;

/**
 * Endonymes vs. exonymes — live (no version pinned). The historical note is
 * rendered to signal that this doctrine link follows the latest published
 * version.
 */
export const EndonymesLive: Story = {
  name: "Endonymes vs. exonymes — live",
  args: { slug: "endonymes-vs-exonymes" },
};

/**
 * Endonymes vs. exonymes — pinned to v1. The historical note disappears,
 * the URL embeds the `@v1` suffix.
 */
export const EndonymesPinnedV1: Story = {
  name: "Endonymes vs. exonymes — pinned v1",
  args: { slug: "endonymes-vs-exonymes", version: 1 },
};

export const ClassificationsContesteesLive: Story = {
  name: "Classifications contestées — live",
  args: { slug: "classifications-contestees" },
};

export const ClassificationsContesteesPinnedV2: Story = {
  name: "Classifications contestées — pinned v2",
  args: { slug: "classifications-contestees", version: 2 },
};

export const HeritageColonialLive: Story = {
  name: "Héritage colonial — live",
  args: { slug: "heritage-colonial" },
};

export const HeritageColonialPinnedV1: Story = {
  name: "Héritage colonial — pinned v1",
  args: { slug: "heritage-colonial", version: 1 },
};

export const TopicsSensiblesLive: Story = {
  name: "Topics sensibles — live",
  args: { slug: "topics-sensibles" },
};

export const TopicsSensiblesPinnedV3: Story = {
  name: "Topics sensibles — pinned v3",
  args: { slug: "topics-sensibles", version: 3 },
};
