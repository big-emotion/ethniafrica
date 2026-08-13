import type { Meta, StoryObj } from "@storybook/react";

import { RelationTypeBadge } from "@/components/relations/RelationTypeBadge";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type { RelationBadgeType } from "@/lib/relationsDataTransformer";

const ALL_TYPES: RelationBadgeType[] = [
  "linguistic",
  "migratory",
  "commercial",
  "religious",
];

const meta = {
  title: "Relations/RelationTypeBadge",
  component: RelationTypeBadge,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof RelationTypeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All four relation types, sourced and AFRIK-derived, side by side (illustrative, not data). */
const allTypesAndDerived: Story = {
  args: { type: "migratory" },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => (
          <RelationTypeBadge key={type} type={type} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => (
          <RelationTypeBadge key={type} type={type} derived />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => (
          <RelationTypeBadge key={type} type={type} size="card" />
        ))}
      </div>
    </div>
  ),
};

// @req REQ-097
export const Mobile430 = atFicheBreakpoint(
  allTypesAndDerived,
  "ficheMobile430"
);
// @req REQ-097
export const Tablet720 = atFicheBreakpoint(
  allTypesAndDerived,
  "ficheTablet720"
);
// @req REQ-097
export const Desktop800 = atFicheBreakpoint(
  allTypesAndDerived,
  "ficheDesktop800"
);
