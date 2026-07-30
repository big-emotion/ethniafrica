import type { HierarchyNode } from "@/components/system/hierarchy-types";

/**
 * Shared fixture for the classification tree (7.9) and HierarchyTextIndex
 * (7.8) stories/tests, so tree-vs-list information equivalence is
 * reviewable. Models one linguistic family with two language branches (one
 * flagged) plus the unlinked group of peoples with no referenced language.
 */
// @req REQ-047
export const hierarchyFixture: HierarchyNode[] = [
  {
    id: "lng-swa",
    type: "language",
    name: "Swahili",
    endonym: { label: "Kiswahili", lang: "sw" },
    peopleCount: 2,
    href: "/fr/familles/FLG_BANTU#lng-swa",
    classificationStatus: null,
    children: [
      {
        id: "PPL_SWAHILI",
        type: "people",
        name: "Waswahili",
        endonym: { label: "Waswahili", lang: "sw" },
        peopleCount: 1,
        href: "/fr/peuples/PPL_SWAHILI",
      },
      {
        id: "PPL_COMORIAN",
        type: "people",
        name: "Comorien",
        endonym: { label: "Wangazidja", lang: "zdj" },
        peopleCount: 1,
        href: "/fr/peuples/PPL_COMORIAN",
      },
    ],
  },
  {
    id: "lng-lin",
    type: "language",
    name: "Lingala",
    endonym: { label: "Lingála", lang: "ln" },
    peopleCount: 1,
    href: "/fr/familles/FLG_BANTU#lng-lin",
    classificationStatus: "contested",
    children: [
      {
        id: "PPL_BANGALA",
        type: "people",
        name: "Bangala",
        endonym: { label: "Bangála", lang: "ln" },
        peopleCount: 1,
        href: "/fr/peuples/PPL_BANGALA",
      },
    ],
  },
  {
    id: "unlinked",
    type: "unlinked-group",
    name: "Peuples sans langue référencée",
    peopleCount: 2,
    children: [
      {
        id: "PPL_ORPHAN_A",
        type: "people",
        name: "Peuple orphelin A",
        endonym: { label: "Endonyme A", lang: "und" },
        peopleCount: 1,
        href: "/fr/peuples/PPL_ORPHAN_A",
      },
      {
        id: "PPL_ORPHAN_B",
        type: "people",
        name: "Peuple orphelin B",
        endonym: { label: "Endonyme B", lang: "und" },
        peopleCount: 1,
        href: "/fr/peuples/PPL_ORPHAN_B",
      },
    ],
  },
];

/** Fixture variant with no unlinked group, to test its absence renders nothing. */
// @req REQ-047
export const hierarchyFixtureWithoutUnlinkedGroup: HierarchyNode[] =
  hierarchyFixture.filter((node) => node.type !== "unlinked-group");
