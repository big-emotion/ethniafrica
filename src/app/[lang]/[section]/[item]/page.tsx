import { redirect, notFound } from "next/navigation";
import { Language } from "@/types/shared";
import { getLocalizedRoute } from "@/lib/routing";

type SectionType = "country" | "region" | "ethnicity" | "family" | "people";

const LANGUAGE_SEGMENTS: Record<Language, Record<SectionType, string>> = {
  en: {
    country: "countries",
    region: "regions",
    ethnicity: "ethnicities",
    family: "families",
    people: "peoples",
  },
  fr: {
    country: "pays",
    region: "regions",
    ethnicity: "ethnies",
    family: "familles",
    people: "peuples",
  },
};

function resolveSection(lang: Language, section: string): SectionType | null {
  const mapping = LANGUAGE_SEGMENTS[lang];
  const match = (Object.keys(mapping) as SectionType[]).find(
    (type) => mapping[type] === section
  );
  return match ?? null;
}

// This page handles legacy slug-based URLs and redirects to the new v2 query-param based routes
export default async function LegacyDetailRedirect({
  params,
}: {
  params: Promise<{ lang: string; section: string; item: string }>;
}) {
  const { lang, section, item } = await params;

  if (!["en", "fr"].includes(lang)) {
    notFound();
  }

  const language = lang as Language;
  const sectionType = resolveSection(language, section);

  if (!sectionType) {
    notFound();
  }

  const decodedItem = decodeURIComponent(item);

  // Redirect to the appropriate v2 route with query params
  if (sectionType === "country") {
    const route = getLocalizedRoute(language, "countries");
    redirect(`${route}?country=${encodeURIComponent(decodedItem)}`);
  }

  if (sectionType === "region" || sectionType === "family") {
    // Regions are now replaced by language families
    const route = getLocalizedRoute(language, "families");
    redirect(`${route}?family=${encodeURIComponent(decodedItem)}`);
  }

  if (sectionType === "ethnicity" || sectionType === "people") {
    // Ethnicities are now called peoples
    const route = getLocalizedRoute(language, "peoples");
    redirect(`${route}?people=${encodeURIComponent(decodedItem)}`);
  }

  notFound();
}
