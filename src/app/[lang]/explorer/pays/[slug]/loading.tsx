import { FicheLoadingScreen } from "@/components/fiche/FicheLoadingScreen";

/**
 * Without this file App Router blocks the whole navigation on the country
 * fiche's server response: the reader clicks and the previous page simply
 * stays, with no sign that anything is happening. Declaring it turns the
 * segment into a Suspense boundary that is swapped in on the click itself.
 */
// @req REQ-104
export default function CountryFicheLoading() {
  return <FicheLoadingScreen entityType="country" sectionName="Pays" />;
}
