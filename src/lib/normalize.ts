/**
 * Normalise une chaîne de caractères en enlevant les accents
 * pour permettre les comparaisons insensibles aux accents
 */
// @req REQ-002
export const normalizeString = (str: string | undefined | null): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Convertit un nom en clé camelCase normalisée pour les URLs
 * Exemples:
 * - "Adja & apparentés" → "adjaApparentes"
 * - "Afrique du Sud" → "afriqueDuSud"
 * - "Chokwe & Lunda" → "chokweLunda"
 * - "Ambundu (Mbundu)" → "ambunduMbundu"
 */
// @req REQ-002
export const normalizeToKey = (name: string): string => {
  if (!name) return "";

  // Normaliser: enlever accents, convertir en minuscules
  let normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Remplacer les caractères spéciaux par des espaces
  normalized = normalized
    .replace(/[&/()]/g, " ") // &, /, parenthèses → espace
    .replace(/[^\w\s-]/g, " ") // Autres caractères spéciaux → espace
    .replace(/\s+/g, " ") // Multiples espaces → un seul
    .trim();

  // Convertir en camelCase
  const words = normalized.split(" ").filter((word) => word.length > 0);
  if (words.length === 0) return "";

  // Premier mot en minuscule, autres avec première lettre majuscule
  const camelCase = words
    .map((word, index) => {
      if (index === 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");

  return camelCase;
};
