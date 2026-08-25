"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/shared";
import { getLocalizedRoute, getPageFromRoute } from "@/lib/routing";
import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/brand";
import { isQuizFeatureEnabled } from "@/lib/featureFlags";

interface DesktopNavBarProps {
  language: Language;
  onLanguageChange?: (lang: Language) => void;
}

// @req [14.5]
export const DesktopNavBar = ({ language }: DesktopNavBarProps) => {
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

          {/* Inline nav: Pays · Peuples · Familles · À propos · Doctrine · API */}
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
            <Link href={`/${language}/about`} className={navLinkClass(isAbout)}>
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

          {/* Home indicator (visually hidden, semantic only) */}
          <span className="sr-only">{isHome ? "Accueil" : ""}</span>
        </div>
      </div>
    </nav>
  );
};
