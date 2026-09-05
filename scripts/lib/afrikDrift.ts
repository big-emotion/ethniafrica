import { canonicalize } from "@/lib/afrik/translations/hashing";

export interface AfrikContentRecord {
  id: string;
  content: unknown;
}

export interface AfrikContentSnapshot {
  languageFamilies: AfrikContentRecord[];
  peoples: AfrikContentRecord[];
  countries: AfrikContentRecord[];
}

export interface AfrikEntityDrift {
  missing: string[];
  stale: string[];
}

export interface AfrikDriftReport {
  languageFamilies: AfrikEntityDrift;
  peoples: AfrikEntityDrift;
  countries: AfrikEntityDrift;
  hasDrift: boolean;
}

function hasSameContent(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
  );
}

function compareEntities(
  source: AfrikContentRecord[],
  database: AfrikContentRecord[]
): AfrikEntityDrift {
  const databaseById = new Map(
    database.map((record) => [record.id, record.content])
  );
  const missing: string[] = [];
  const stale: string[] = [];

  for (const record of source) {
    if (!databaseById.has(record.id)) {
      missing.push(record.id);
      continue;
    }

    if (!hasSameContent(record.content, databaseById.get(record.id))) {
      stale.push(record.id);
    }
  }

  return {
    missing: missing.sort(),
    stale: stale.sort(),
  };
}

export function compareAfrikDrift(
  source: AfrikContentSnapshot,
  database: AfrikContentSnapshot
): AfrikDriftReport {
  const languageFamilies = compareEntities(
    source.languageFamilies,
    database.languageFamilies
  );
  const peoples = compareEntities(source.peoples, database.peoples);
  const countries = compareEntities(source.countries, database.countries);

  return {
    languageFamilies,
    peoples,
    countries,
    hasDrift:
      languageFamilies.missing.length > 0 ||
      languageFamilies.stale.length > 0 ||
      peoples.missing.length > 0 ||
      peoples.stale.length > 0 ||
      countries.missing.length > 0 ||
      countries.stale.length > 0,
  };
}
