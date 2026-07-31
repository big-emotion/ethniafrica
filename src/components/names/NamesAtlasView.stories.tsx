import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { NamesAtlasView } from "@/components/names/NamesAtlasView";
import type { NameAtlasEntry } from "@/components/names/NamesAtlasView";

// Storybook uses `@storybook/react-vite` (no Next.js App Router context), so
// stub `fetch` at module load — the query key never changes across these
// stories and `staleTime: Infinity` (set by NamesAtlasView for the initial
// params) keeps it from firing anyway, but this guards against a real
// network call if that invariant ever changes.
globalThis.fetch = (async () => ({
  ok: true,
  json: async () => ({ data: { names: [], total: 0 } }),
})) as unknown as typeof fetch;

const viewports = {
  mobile320: {
    name: "Mobile 320 px",
    styles: { width: "320px", height: "900px" },
  },
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "900px" },
  },
  desktop800: {
    name: "Desktop 800 px",
    styles: { width: "800px", height: "900px" },
  },
};

const populatedNames: NameAtlasEntry[] = [
  {
    id: "1",
    nameText: "Jieng",
    nameType: "endonym",
    imposedBy: null,
    peopleId: "PPL_JIENG",
    peopleName: "Jieng",
  },
  {
    id: "2",
    nameText: "Dinka",
    nameType: "exonym",
    imposedBy: "administration coloniale britannique",
    peopleId: "PPL_JIENG",
    peopleName: "Jieng",
  },
  {
    id: "3",
    nameText: "Bakongo",
    nameType: "endonym",
    imposedBy: null,
    peopleId: "PPL_BAKONGO",
    peopleName: "Bakongo",
  },
  {
    id: "4",
    nameText: "Baluba",
    nameType: "surname",
    imposedBy: null,
    peopleId: "PPL_LUBA",
    peopleName: "Luba",
  },
];

const meta = {
  title: "Names/NamesAtlasView",
  component: NamesAtlasView,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      return (
        <QueryClientProvider client={client}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  parameters: {
    layout: "padded",
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
} satisfies Meta<typeof NamesAtlasView>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req FR53 @req FR55
export const Populated320: Story = {
  name: "Liste groupée alphabétiquement — 320 px",
  args: { initialNames: populatedNames, initialTotal: populatedNames.length },
  parameters: { viewport: { defaultViewport: "mobile320" } },
};

// @req FR53 @req FR55
export const Populated430: Story = {
  name: "Liste groupée alphabétiquement — 430 px",
  args: { initialNames: populatedNames, initialTotal: populatedNames.length },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};

// @req FR53 @req FR55
export const Populated720: Story = {
  name: "Escalade en grille à deux colonnes — 720 px",
  args: { initialNames: populatedNames, initialTotal: populatedNames.length },
  parameters: { viewport: { defaultViewport: "tablet720" } },
};

// @req FR53 @req FR55
export const Populated800: Story = {
  name: "Escalade en grille à trois colonnes — 800 px",
  args: { initialNames: populatedNames, initialTotal: populatedNames.length },
  parameters: { viewport: { defaultViewport: "desktop800" } },
};

// @req FR53 FR55 (calm empty state — no emoji, no "Oops")
export const EmptyState: Story = {
  name: "Aucun résultat — état calme avec signalement pré-rempli",
  args: { initialNames: [], initialTotal: 0, initialQuery: "jiengg" },
  parameters: { viewport: { defaultViewport: "mobile430" } },
};
