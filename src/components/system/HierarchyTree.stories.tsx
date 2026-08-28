import type { Meta, StoryObj } from "@storybook/react";

import {
  HierarchyTree,
  type HierarchyNode,
} from "@/components/system/HierarchyTree";
import { getPeopleRoute } from "@/lib/routing";

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

const fixtureRoot: HierarchyNode = {
  id: "FLG_BANTU",
  label: "Bantou",
  childCount: 3,
  children: [
    {
      id: "kon",
      label: "Kikongo",
      labelLang: "kon",
      childCount: 1,
      children: [
        {
          id: "PPL_KONGO",
          label: "Kongo",
          href: getPeopleRoute("fr", "PPL_KONGO"),
        },
      ],
    },
    {
      id: "lin",
      label: "Lingala",
      labelLang: "lin",
      badge: "contested",
      childCount: 2,
    },
    {
      id: "unlinked",
      label: "peuples sans langue référencée",
      childCount: 2,
      children: [
        {
          id: "PPL_UNLINKED_A",
          label: "Peuple non rattaché A",
          href: getPeopleRoute("fr", "PPL_UNLINKED_A"),
          badge: "colonial-legacy",
        },
        {
          id: "PPL_UNLINKED_B",
          label: "Peuple non rattaché B",
          href: getPeopleRoute("fr", "PPL_UNLINKED_B"),
        },
      ],
    },
  ],
};

const meta = {
  title: "System/HierarchyTree",
  component: HierarchyTree,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <main className="min-h-screen bg-afh-bg p-afh-lg md:p-afh-5xl">
        <div className="mx-auto max-w-[800px]">
          <h2
            id="hierarchy-tree-label"
            className="mb-afh-md font-afh-display text-afh-h2 font-semibold text-afh-text"
          >
            Classification
          </h2>
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
  args: {
    root: fixtureRoot,
    labelledById: "hierarchy-tree-label",
  },
} satisfies Meta<typeof HierarchyTree>;

export default meta;
type Story = StoryObj<typeof meta>;

// @req REQ-044
export const Skeleton430: Story = {
  name: "Skeleton (collapsed root) — 430 px",
  parameters: {
    viewport: { defaultViewport: "mobile430" },
  },
};

// @req REQ-044
export const Expanded720: Story = {
  name: "Expanded branch — 720 px",
  args: {
    defaultExpandedIds: ["FLG_BANTU", "kon"],
  },
  parameters: {
    viewport: { defaultViewport: "tablet720" },
  },
};

// @req REQ-047
export const LazyLoading800: Story = {
  name: "Lazy-loading branch — 800 px",
  args: {
    defaultExpandedIds: ["FLG_BANTU", "lin"],
    loadChildren: () => new Promise<HierarchyNode[]>(() => {}),
  },
  parameters: {
    viewport: { defaultViewport: "desktop800" },
  },
};

// @req REQ-044
export const UnlinkedGroup720: Story = {
  name: "Unlinked peoples group — 720 px",
  args: {
    defaultExpandedIds: ["FLG_BANTU", "unlinked"],
  },
  parameters: {
    viewport: { defaultViewport: "tablet720" },
  },
};

// @req REQ-023
export const Badges800: Story = {
  name: "Classification badges — 800 px",
  args: {
    defaultExpandedIds: ["FLG_BANTU", "unlinked"],
  },
  parameters: {
    viewport: { defaultViewport: "desktop800" },
  },
};
