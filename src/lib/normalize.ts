/**
 * Normalise une chaîne de caractères en enlevant les accents
 * pour permettre les comparaisons insensibles aux accents
 */
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Obtient la première lettre normalisée d'une chaîne
 * (sans accent, en majuscule)
 */
export const getNormalizedFirstLetter = (str: string): string => {
  // Gérer les noms qui commencent par des guillemets ou caractères spéciaux
  let firstChar = str.trim().charAt(0);
  if (firstChar === '"') {
    firstChar = str.trim().charAt(1);
  }
  
  const normalized = normalizeString(firstChar);
  return normalized.toUpperCase();
};

