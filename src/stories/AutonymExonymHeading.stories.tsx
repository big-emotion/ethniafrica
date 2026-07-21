import type { Meta, StoryObj } from "@storybook/react";
import { AutonymExonymHeading } from "../components/ui/AutonymExonymHeading";

const meta: Meta<typeof AutonymExonymHeading> = {
  title: "UI/AutonymExonymHeading",
  component: AutonymExonymHeading,
  parameters: {
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AutonymExonymHeading>;

export const HeroMobile: Story = {
  name: "Hero – 430 px (mobile)",
  args: {
    autonym: "Yorùbá",
    autonymIso639_3: "yor",
    exonym: "Yoruba",
    ipa: "jóɾùbá",
    variant: "hero",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    docs: {
      description: {
        story:
          "Hero variant: autonym in `font-afh-display font-black` = Fraunces weight-900 " +
          '(loaded via `next/font/google` with `weight: ["300","500","700","900"]` ' +
          "in `src/app/layout.tsx`; mapped to `--font-fraunces` CSS variable via " +
          '`tailwind.config.ts` `fontFamily["afh-display"]`). ' +
          "Exonym in `font-afh font-medium` = Nunito Sans weight-500.",
      },
    },
  },
};

export const HeroTablet: Story = {
  name: "Hero – 720 px (tablet)",
  args: {
    autonym: "Yorùbá",
    autonymIso639_3: "yor",
    exonym: "Yoruba",
    ipa: "jóɾùbá",
    variant: "hero",
  },
  parameters: {
    viewport: { defaultViewport: "tablet" },
  },
};

export const HeroDesktop: Story = {
  name: "Hero – 1200 px (desktop)",
  args: {
    autonym: "Yorùbá",
    autonymIso639_3: "yor",
    exonym: "Yoruba",
    ipa: "jóɾùbá",
    variant: "hero",
  },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

export const Inline: Story = {
  name: "Inline variant",
  args: {
    autonym: "Hausa",
    autonymIso639_3: "hau",
    exonym: "Hausa",
    variant: "inline",
  },
};

export const Card: Story = {
  name: "Card variant",
  args: {
    autonym: "Ìgbò",
    autonymIso639_3: "ibo",
    exonym: "Igbo",
    variant: "card",
  },
};

export const WithAlternateNames: Story = {
  name: "With +N autres alternateNames",
  args: {
    autonym: "Fula",
    autonymIso639_3: "ful",
    exonym: "Fulani",
    alternateNames: ["Peul", "Fulfulde", "Fula"],
    variant: "hero",
  },
};

export const RequiredPropsOnly: Story = {
  name: "Required props only (no exonym, no IPA)",
  args: {
    autonym: "Wolof",
    autonymIso639_3: "wol",
  },
};
