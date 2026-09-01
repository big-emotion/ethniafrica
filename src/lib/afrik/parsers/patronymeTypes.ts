import type { SourceKind, SourceTier } from "@/types/sources";

/** @req REQ-133 */
export const PATRONYME_NAME_SYSTEMS = [
  "clan_name",
  "non_hereditary_patronymic",
  "nisba",
  "praise_name",
  "totemic_clan",
] as const;

export type PatronymeNameSystem = (typeof PATRONYME_NAME_SYSTEMS)[number];
export type PatronymeId = `PAT_${string}`;
export type PatronymePeopleId = `PPL_${string}`;
export type PatronymePersonId = `PER_${string}`;

export interface PatronymeSource {
  sourceKey: string;
  title: string;
  url: string | null;
  tier: SourceTier;
  source_kind?: SourceKind;
  notes?: string;
  isSelfIdentification?: boolean;
}

export interface PatronymeSourceReference {
  sourceRefs: string[];
}

export interface PatronymeFicheMeta {
  format: "AFRIK JSON v2";
  entity: "patronyme";
  directives: string;
  illustrative?: boolean;
}

export interface PatronymeSpelling {
  spelling: string;
  attestations: Array<
    PatronymeSourceReference & {
      countryId: string;
    }
  >;
}

export interface PatronymeOriginClaim extends PatronymeSourceReference {
  claim: string;
  claimStatus: "claimed" | "contested" | "established";
}

export interface PatronymeOralOriginClaim extends PatronymeOriginClaim {
  griot: string;
  transcription: string;
}

export interface PatronymeOrigin {
  oralTraditions: PatronymeOralOriginClaim[];
  writtenChronicles: PatronymeOriginClaim[];
  linguisticReconstructions: PatronymeOriginClaim[];
}

export interface PatronymePeopleAssociation extends PatronymeSourceReference {
  peopleId: PatronymePeopleId;
  status: "attested" | "supposed";
}

export interface PatronymeCountryAssociation extends PatronymeSourceReference {
  countryId: string;
  status: "attested" | "supposed";
}

export interface PatronymeAlliance extends PatronymeSourceReference {
  targetPatronymeId: PatronymeId;
  allianceType: string;
}

export interface PatronymeSourcedValue extends PatronymeSourceReference {
  value: string;
}

export type PatronymeBearer =
  | (PatronymeSourceReference & {
      status: "deceased";
      personId: PatronymePersonId;
      displayName?: never;
    })
  | (PatronymeSourceReference & {
      status: "deceased";
      personId?: never;
      displayName: string;
    })
  | (PatronymeSourceReference & {
      status: "aggregated";
      description: string;
    })
  | (PatronymeSourceReference & {
      status: "living_self_identified";
      personId: PatronymePersonId;
      selfIdentificationSourceRef: string;
    });

export interface PatronymeHomonym extends PatronymeSourceReference {
  label: string;
  entityType: "patronyme" | "people" | "person" | "place" | "other";
  entityId: PatronymeId | PatronymePeopleId | PatronymePersonId | string | null;
  distinction: string;
}

export interface PatronymeGap {
  fieldPath: string;
  reason: string;
}

interface PatronymeDossierCommon {
  _meta: PatronymeFicheMeta;
  id: PatronymeId;
  nameMain: string;
  spellings: PatronymeSpelling[];
  transmissionMode:
    | "patrilineal"
    | "matrilineal"
    | "bilateral"
    | "elective"
    | "non_hereditary"
    | "other";
  designatedSocialUnit:
    | "individual"
    | "lineage"
    | "clan"
    | "caste"
    | "age_set"
    | "settlement"
    | "other";
  origin: PatronymeOrigin;
  peoples: PatronymePeopleAssociation[];
  countries: PatronymeCountryAssociation[];
  alliances: PatronymeAlliance[];
  casteOrSocialFunction: PatronymeSourcedValue | null;
  bearers: PatronymeBearer[];
  homonyms: PatronymeHomonym[];
  sources: PatronymeSource[];
  gaps: PatronymeGap[];
}

export interface PatronymeClanNameDossier extends PatronymeDossierCommon {
  nameSystem: "clan_name";
}

export interface PatronymeNonHereditaryDossier extends PatronymeDossierCommon {
  nameSystem: "non_hereditary_patronymic";
  patronymicChainDepth?: {
    generations: number;
    sourceRefs: string[];
  };
}

export interface PatronymeNisbaDossier extends PatronymeDossierCommon {
  nameSystem: "nisba";
  nisbaSubtype?: {
    value: "geographic" | "tribal" | "occupational" | "other";
    sourceRefs: string[];
  };
}

export interface PatronymePraiseNameDossier extends PatronymeDossierCommon {
  nameSystem: "praise_name";
}

export interface PatronymeTotemicClanDossier extends PatronymeDossierCommon {
  nameSystem: "totemic_clan";
  totemicFoodProhibition?: PatronymeSourcedValue;
  permittedGivenNames?: Array<
    PatronymeSourceReference & {
      name: string;
    }
  >;
}

export type PatronymeDossier =
  | PatronymeClanNameDossier
  | PatronymeNonHereditaryDossier
  | PatronymeNisbaDossier
  | PatronymePraiseNameDossier
  | PatronymeTotemicClanDossier;
