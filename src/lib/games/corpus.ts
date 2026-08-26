import type { CountryId } from "@/types/afrik";
import type { AutonymExonymName } from "@/types/quiz";
import type { MigrationGeometry } from "@/types/migrations";
import type { RelationType } from "@/types/relations";

/**
 * The corpus slices the eleven round generators read (REQ-120).
 *
 * Each generator is a pure function from one of these to a GameRound, so the
 * games are testable without Supabase and the service layer stays the only
 * thing that knows how a row is shaped. Field names mirror the fiche paths
 * they are drawn from, the way QuizPeopleFixture already does.
 *
 * These deliberately carry only what the corpus really holds. Three traps the
 * corpus survey turned up are encoded here rather than left to be rediscovered:
 * a people's share of a country is a population count, not a percentage
 * (`percentage` is set in 32 of 1611 entries); a country's etymology is a
 * top-level column, not a `content` field; and `relation_type` offers three
 * values, not four.
 */

export interface GamePeopleFixture {
  id: string;
  /** `name_main` — the heading a reader recognises. */
  nameMain: string;
  /** Autonym-first pair, so a caller never flattens a people to a bare string. */
  name: AutonymExonymName;
  /** `content.appellations.selfAppellation` — null in 2 fiches despite its type. */
  selfAppellation: string | null;
  /** `content.appellations.exonyms` */
  exonyms: string[];
  /** `content.appellations.originOfExonyms` — the verbatim reveal for the appellations game. */
  originOfExonyms: string | null;
  /** Top-level `currentCountries`, which is what the join table follows. */
  currentCountries: CountryId[];
  /** `content.demography.totalPopulation` */
  totalPopulation: number | null;
  /**
   * `content.demography.distributionByCountry`. `population` is present in all
   * 1611 corpus entries; `percentage` is not, so shares are derived here.
   */
  distributionByCountry: GameCountryShare[];
  languageFamilyId: string | null;
  languageFamilyNameFr: string | null;
}

export interface GameCountryShare {
  country: CountryId;
  population: number | null;
}

export interface GameKingdom {
  name: string;
  period: string;
  dominantPeoples: string[];
  politicalCenters: string[];
  historicalRole: string;
}

export interface GameHistoricalNames {
  antiquity?: string;
  middleAges?: string;
  precolonial?: string;
  colonization?: string;
  contemporary?: string;
}

export interface GameCountryFixture {
  id: CountryId;
  nameFr: string;
  /** Top-level column `etymology` — NOT `content.etymology`, which does not exist. */
  etymology: string | null;
  /** Top-level column `name_origin_actor`; set on all 54 country fiches. */
  nameOriginActor: string | null;
  historicalNames: GameHistoricalNames | null;
  kingdoms: GameKingdom[];
}

export interface GameFamilyFixture {
  id: string;
  nameFr: string;
}

export interface GameRelationFixture {
  id: string;
  relationType: RelationType;
  peopleIdA: string;
  peopleIdB: string;
  /** Verbatim `description` — the reveal, never paraphrased. */
  description: string;
  periodLabel: string | null;
}

export interface GameMigrationPeople {
  id: string;
  nameMain: string;
  /** Free text at MVP; the corpus uses "origin" and "destination". */
  role: string | null;
}

export interface GameMigrationFixture {
  id: string;
  name: string;
  summary: string;
  geometry: MigrationGeometry | null;
  peoples: GameMigrationPeople[];
}

/** Everything a round generator may be handed. A game reads only its own slice. */
export interface GameCorpus {
  peoples: GamePeopleFixture[];
  countries: GameCountryFixture[];
  families: GameFamilyFixture[];
  relations: GameRelationFixture[];
  migrations: GameMigrationFixture[];
}

/** Human-readable French label for each stored relation type. */
// @req REQ-120
export const RELATION_TYPE_LABEL_FR: Record<RelationType, string> = {
  migratory: "migratoire",
  commercial: "commercial",
  religious: "religieux",
};
