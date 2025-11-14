/**
 * Système de versioning des données pour invalidation automatique du cache client
 *
 * Quand les données changent (migration, mise à jour), on incrémente la version.
 * Le client compare sa version avec celle du serveur et invalide automatiquement
 * le cache si les versions diffèrent.
 */

// Clés de version pour chaque type de données
export const DATA_VERSION_KEYS = {
  REGIONS: "data:version:regions",
  COUNTRIES: "data:version:countries",
  ETHNICITIES: "data:version:ethnicities",
  POPULATION: "data:version:population",
} as const;

// Version actuelle des données (incrémentée lors des migrations)
// En production, cette valeur devrait être stockée dans une variable d'environnement
// ou dans la base de données pour persister entre les redémarrages
const dataVersions: Record<string, number> = {
  [DATA_VERSION_KEYS.REGIONS]: 1,
  [DATA_VERSION_KEYS.COUNTRIES]: 1,
  [DATA_VERSION_KEYS.ETHNICITIES]: 1,
  [DATA_VERSION_KEYS.POPULATION]: 1,
};

/**
 * Obtenir la version actuelle d'un type de données
 */
export function getDataVersion(key: string): number {
  return dataVersions[key] || 1;
}

/**
 * Incrémenter la version d'un type de données
 * (appelé lors de l'invalidation du cache)
 */
export function incrementDataVersion(key: string): void {
  dataVersions[key] = (dataVersions[key] || 1) + 1;
}

/**
 * Incrémenter toutes les versions (lors d'une migration complète)
 */
export function incrementAllVersions(): void {
  Object.keys(DATA_VERSION_KEYS).forEach((key) => {
    const versionKey = DATA_VERSION_KEYS[key as keyof typeof DATA_VERSION_KEYS];
    incrementDataVersion(versionKey);
  });
}

/**
 * Obtenir toutes les versions actuelles
 */
export function getAllVersions(): Record<string, number> {
  return { ...dataVersions };
}
