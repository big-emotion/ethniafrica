"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Language } from "@/types/shared";
import { getLocalizedRoute, getPageFromRoute } from "@/lib/routing";
import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/brand";
import { isQuizFeatureEnabled } from "@/lib/featureFlags";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface DesktopNavBarProps {
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onSearchClick?: () => void;
}

// @req [14.5]
// @req REQ-111
export const DesktopNavBar = ({
  language,
  onSearchClick,
}: DesktopNavBarProps) => {
  const pathname = usePathname();

  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");
  const migrationsRoute = getLocalizedRoute(language, "migrations");
  const colonizationRoute = getLocalizedRoute(language, "colonization");
  const quizRoute = getLocalizedRoute(language, "quiz");

  const currentPage = getPageFromRoute(pathname);
  const isHome = pathname === `/${language}` || pathname === "/";
  const isAbout = pathname.startsWith(`/${language}/about`);
  const isDoctrine = pathname.startsWith(`/${language}/doctrine`);
  const isApi = pathname.startsWith(`/docs/api`);

  const navLinkClass = (active: boolean) =>
    `min-h-11 flex items-center px-3 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  // Every route, including home, wears the validated global shell — static
  // (non-sticky/fixed) so it never collides with a route-local sticky
  // secondary bar (R3/FR105).
  return (
    <nav
      className="hidden lg:block z-50 bg-card border-b shadow-sm"
      aria-label="Navigation principale"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 h-14">
          {/* Logo */}
          <Link
            href={`/${language}`}
            className="flex items-center gap-2 shrink-0"
          >
            <Image
              src="/africa.png"
              alt={PRODUCT_NAME}
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="flex items-baseline gap-2.5">
              <span
                style={{
                  fontFamily: "var(--afh-font-display)",
                  fontWeight: 900,
                  fontSize: "17px",
                  letterSpacing: ".01em",
                  color: "var(--afh-text)",
                }}
              >
                {PRODUCT_NAME}
              </span>
            </span>
          </Link>

          {/* Inline nav: Pays · Peuples · Familles · Migrations · Doctrine
              · API. The home carried a reduced brand+search bar under
              REQ-111, on the reasoning that its body already listed the
              modules as cards. The body now offers three axes rather than
              ten modules, so the destinations the reduced bar hid are no
              longer one click away — the full bar comes back everywhere. */}
          {
            <div className="flex items-center gap-1">
              <Link
                href={countriesRoute}
                className={navLinkClass(currentPage === "countries")}
              >
                Pays
              </Link>
              <Link
                href={peoplesRoute}
                className={navLinkClass(currentPage === "peoples")}
              >
                Peuples
              </Link>
              <Link
                href={familiesRoute}
                className={navLinkClass(currentPage === "families")}
              >
                Familles
              </Link>
              <Link
                href={migrationsRoute}
                className={navLinkClass(currentPage === "migrations")}
              >
                Migrations
              </Link>
              <Link
                href={colonizationRoute}
                className={navLinkClass(currentPage === "colonization")}
              >
                Colonisation
              </Link>
              {isQuizFeatureEnabled() && (
                <Link
                  href={quizRoute}
                  className={navLinkClass(currentPage === "quiz")}
                >
                  Quiz
                </Link>
              )}
              <Link
                href={`/${language}/about`}
                className={navLinkClass(isAbout)}
              >
                À propos
              </Link>
              <Link
                href={`/${language}/doctrine`}
                className={navLinkClass(isDoctrine)}
              >
                Doctrine
              </Link>
              <Link href="/docs/api/v2" className={navLinkClass(isApi)}>
                API
              </Link>
            </div>
          }

          {/* Search and the surface switch sit at the end of the bar on
              every route (REQ-115), so a reader who wants either never has
              to find the one page that offers it. */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onSearchClick}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border transition-colors"
              style={{
                borderColor: "var(--afh-border)",
                color: "var(--afh-text-soft)",
              }}
              aria-label="Rechercher"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
            <ThemeToggle />
          </div>

          {/* Home indicator (visually hidden, semantic only) */}
          <span className="sr-only">{isHome ? "Accueil" : ""}</span>
        </div>
      </div>
    </nav>
  );
};
