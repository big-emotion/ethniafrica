import type {
  PeopleFieldMissingOverlay,
  PeopleFieldOverlay,
} from "@/lib/atlas/overlays";
import type { Language } from "@/types/shared";

/**
 * What the flat map is showing, for readers without WebGL.
 *
 * AfricaBasemap is `aria-hidden`, so on that path this sentence is the whole
 * of what a screen reader is told about the map that replaced the globe. It
 * therefore names the people, the count, and — the part that matters most —
 * that the halos are densities rather than a territory. A reader who cannot
 * see the gradient has no other way to know the field has no edge.
 */
// @req REQ-116
export function peopleFallbackNote(
  peopleName: string,
  overlay: PeopleFieldOverlay | PeopleFieldMissingOverlay,
  language: Language = "fr"
): string {
  if (overlay.kind !== "people-field") return "";

  const drawn = overlay.areas.length;
  const offMap = overlay.undrawn.length;
  if (language === "en") {
    const countryLabel = drawn === 1 ? "country" : "countries";
    const offMapNote =
      offMap > 0
        ? ` ${offMap} declared ${offMap === 1 ? "presence is" : "presences are"} outside the map.`
        : "";

    return (
      `${drawn} ${countryLabel} where ${peopleName} is present, without 3D rendering. ` +
      "No boundary is drawn: these are densities, not a territory." +
      offMapNote
    );
  }

  const offMapNote =
    offMap > 0
      ? ` ${offMap} présence${offMap > 1 ? "s" : ""} déclarée${
          offMap > 1 ? "s" : ""
        } hors carte.`
      : "";

  return (
    `Les ${drawn} pays de présence ${peopleName}, sans rendu 3D. ` +
    `Aucune limite n'est tracée : ce sont des densités, pas un territoire.` +
    offMapNote
  );
}
