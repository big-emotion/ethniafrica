"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/shared";
import { getLocalizedRoute, getPageFromRoute } from "@/lib/routing";
import Image from "next/image";

interface DesktopNavBarProps {
  language: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const DesktopNavBar = ({ language }: DesktopNavBarProps) => {
  const pathname = usePathname();

  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");

  const currentPage = getPageFromRoute(pathname);
  const isHome = pathname === `/${language}` || pathname === "/";
  const isAbout = pathname.startsWith(`/${language}/about`);
  const isDoctrine = pathname.startsWith(`/${language}/doctrine`);
  const isApi = pathname.startsWith(`/docs/api`);

  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm hidden lg:block"
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
              alt="EthniAfrica"
              width={28}
              height={28}
              className="object-contain"
            />
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
