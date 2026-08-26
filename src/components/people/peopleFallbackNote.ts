import type {
  PeopleFieldMissingOverlay,
  PeopleFieldOverlay,
} from "@/lib/atlas/overlays";

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
  overlay: PeopleFieldOverlay | PeopleFieldMissingOverlay
): string {
  if (overlay.kind !== "people-field") return "";

  const drawn = overlay.areas.length;
  const offMap = overlay.undrawn.length;
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
