import type { Meta, StoryObj } from "@storybook/react";
import { HubCard } from "./HubCard";
import type { AccessModeHub } from "@/lib/accessModeHubs";

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "820px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "820px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "820px" },
  },
};

const meta = {
  title: "Home/HubCard",
  component: HubCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <main
        className="min-h-screen p-6"
        style={{ backgroundColor: "var(--afh-night-ground)" }}
      >
        <div className="mx-auto max-w-[480px]">
          <Story />
        </div>
      </main>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    viewport: { viewports },
    a11y: {
      test: "error",
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      },
    },
  },
} satisfies Meta<typeof HubCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const explorerHub: AccessModeHub = {
  id: "explorer",
  title: "Explorer",
  description:
    "Parcourez les familles linguistiques, les peuples et les pays d'Afrique.",
  isVisible: true,
  surfaces: [
    { page: "countries", label: "Pays", href: "/fr/pays" },
    { page: "families", label: "Familles linguistiques", href: "/fr/familles" },
    { page: "peoples", label: "Peuples", href: "/fr/peuples" },
    { page: "search", label: "Recherche", href: "/fr/recherche" },
  ],
};

const comprendreHub: AccessModeHub = {
  id: "comprendre",
  title: "Comprendre",
  description: "La doctrine éditoriale et le projet qui documentent nos choix.",
  isVisible: true,
  surfaces: [
    { page: "doctrine", label: "Doctrine", href: "/fr/doctrine" },
    { page: "about", label: "À propos", href: "/fr/about" },
  ],
};

export const ExplorerMobile430: Story = {
  name: "Explorer — 430 px",
  args: { hub: explorerHub },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

export const ExplorerTablet720: Story = {
  name: "Explorer — 720 px",
  args: { hub: explorerHub },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

export const ExplorerDesktop800: Story = {
  name: "Explorer — 800 px",
  args: { hub: explorerHub },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

export const ComprendreMobile430: Story = {
  name: "Comprendre — 430 px",
  args: { hub: comprendreHub },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

export const ComprendreTablet720: Story = {
  name: "Comprendre — 720 px",
  args: { hub: comprendreHub },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

export const ComprendreDesktop800: Story = {
  name: "Comprendre — 800 px",
  args: { hub: comprendreHub },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};
