"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Language } from "@/types/shared";
import { getLocalizedRoute } from "@/lib/routing";
import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/brand";

interface MobileNavBarProps {
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onSearchClick?: () => void;
}

// @req [14.5]
export const MobileNavBar = ({
  language,
  onSearchClick,
}: MobileNavBarProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Prototype header skin (epic-14 module spec): only worn on the home
  // route until ETNI-820. Every other route wears the validated global
  // shell — static (non-sticky/fixed) so it never collides with a
  // route-local sticky secondary bar (R3/FR105).
  const isHome = pathname === `/${language}` || pathname === "/";

  return (
    <div
      className={`z-50 lg:hidden ${
        isHome
          ? "fixed top-0 left-0 right-0 afh-home-nav-skin"
          : "bg-card border-b shadow-sm"
      }`}
      aria-label="Navigation principale"
    >
      <div className="px-3 h-[57px] flex items-center justify-between gap-2">
        {/* Logo */}
        <Link
          href={`/${language}`}
          className="flex items-center gap-1.5 shrink-0"
        >
          <Image
            src="/africa.png"
            alt={PRODUCT_NAME}
            width={26}
            height={26}
            className="object-contain"
          />
          <span
            className="font-display font-bold text-base leading-none"
            style={
              isHome
                ? {
                    fontFamily: "var(--afh-font-display)",
                    fontWeight: 900,
                    fontSize: "17px",
                    color: "var(--afh-night-ink)",
                  }
                : undefined
            }
          >
            {PRODUCT_NAME}
          </span>
        </Link>

        {/* Right controls: FLG nav dropdown + search icon */}
        <div className="flex items-center gap-1">
          {/* Compact navigation dropdown (replaces hamburger) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 text-xs font-semibold gap-1 ${
                  isHome
                    ? "h-8 text-[color:var(--afh-night-ink-2)] hover:bg-[color:var(--afh-night-surface-2)] hover:text-[color:var(--afh-night-ink)]"
                    : "min-h-11"
                }`}
                aria-label="Navigation"
              >
                <span
                  className={`text-[11px] font-bold tracking-wide uppercase ${
                    isHome
                      ? "text-[color:var(--afh-night-ink-2)]"
                      : "text-muted-foreground"
                  }`}
                >
                  FLG
                </span>
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 1l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className={isActive(countriesRoute) ? "font-semibold" : ""}
                onSelect={() => router.push(countriesRoute)}
              >
                Pays
              </DropdownMenuItem>
              <DropdownMenuItem
                className={isActive(peoplesRoute) ? "font-semibold" : ""}
                onSelect={() => router.push(peoplesRoute)}
              >
                Peuples
              </DropdownMenuItem>
              <DropdownMenuItem
                className={isActive(familiesRoute) ? "font-semibold" : ""}
                onSelect={() => router.push(familiesRoute)}
              >
                Familles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => router.push(`/${language}/about`)}
              >
                À propos
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => router.push(`/${language}/doctrine`)}
              >
                Doctrine
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/docs/api/v2")}>
                API
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search icon */}
          <Button
            variant="ghost"
            size="icon"
            className={
              isHome
                ? "h-8 w-8 text-[color:var(--afh-night-ink-2)] hover:bg-[color:var(--afh-night-surface-2)] hover:text-[color:var(--afh-night-ink)]"
                : "min-h-11 min-w-11"
            }
            onClick={onSearchClick}
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
