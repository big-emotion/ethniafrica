import {
  ArrowUpDown,
  BookUser,
  Circle,
  Crown,
  Eye,
  FolderTree,
  Globe,
  HelpCircle,
  History,
  Landmark,
  Languages,
  Link2,
  Maximize2,
  MapPin,
  Network,
  Route,
  Scale,
  Scissors,
  Search,
  Signature,
  Sparkles,
  Tag,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * One glyph per module, from the library rather than the mockup's hand-drawn
 * set: half hand-drawn and half library would read as two different stroke
 * weights side by side. Sized 15px at stroke 1.9 — the mockup's own metrics.
 *
 * Keyed loosely rather than by `HubModuleDefinition["id"]`, so the map may
 * hold a key the registry no longer files — the fallback below is `Circle`,
 * and a module with no glyph is a smaller failure than a build that breaks
 * because a game was retired.
 *
 * This lived in `SiteHeader.tsx` while the header was the only surface drawing
 * module cards. The axis hubs draw the same set (brand charter §8.6), and a
 * module wearing one sign in the menu and another on its own hub is exactly
 * the drift the contract there forbids — so the table moved out of the one
 * consumer that happened to own it first.
 */
const MODULE_GLYPHS: Record<string, LucideIcon> = {
  peuples: Users,
  pays: Globe,
  familles: Network,
  recherche: Search,
  noms: Tag,
  // Three modules had been reaching the fallback in silence — `anecdotes`
  // since the bank shipped, `langues` and `patronymes` since ETNI-1801 added
  // them. Each was wearing a blank disc beside twenty modules carrying a sign,
  // which no test could see and no diff showed. The contract suite of the
  // Nommer dossier now holds this map.
  langues: Languages,
  patronymes: BookUser,
  nommer: Signature,
  anecdotes: Sparkles,
  frise: History,
  "regards-colonisation": Eye,
  quiz: HelpCircle,
  appellations: Tags,
  "plus-ou-moins": ArrowUpDown,
  mercator: Maximize2,
  comparer: Scale,
  repartition: MapPin,
  "pays-davant": Landmark,
  royaumes: Crown,
  migrations: Route,
  liens: Link2,
  "jeu-familles": FolderTree,
  frontieres: Scissors,
};

/** The sign a module wears, wherever it is drawn. */
// @req REQ-114
export function glyphForModule(moduleId: string): LucideIcon {
  return MODULE_GLYPHS[moduleId] ?? Circle;
}

/** The table itself, for the contract suites that hold it against the registry. */
// @req REQ-114
export { MODULE_GLYPHS };
