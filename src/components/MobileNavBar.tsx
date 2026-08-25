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
import { isQuizFeatureEnabled } from "@/lib/featureFlags";

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
  const migrationsRoute = getLocalizedRoute(language, "migrations");
  const colonizationRoute = getLocalizedRoute(language, "colonization");
  const quizRoute = getLocalizedRoute(language, "quiz");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Every route, including home, wears the validated global shell — static
  // (non-sticky/fixed) so it never collides with a route-local sticky
  // secondary bar (R3/FR105).
  return (
    <div
      className="z-50 lg:hidden bg-card border-b shadow-sm"
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
            alt=""
            width={26}
            height={26}
            className="object-contain"
          />
          <span className="font-display font-bold text-base leading-none">
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
                className="px-2 text-xs font-semibold gap-1 min-h-11"
                aria-label="Navigation FLG"
              >
                <span className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">
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
              <DropdownMenuItem
                className={isActive(migrationsRoute) ? "font-semibold" : ""}
                onSelect={() => router.push(migrationsRoute)}
              >
                Migrations
              </DropdownMenuItem>
              <DropdownMenuItem
                className={isActive(colonizationRoute) ? "font-semibold" : ""}
                onSelect={() => router.push(colonizationRoute)}
              >
                Colonisation
              </DropdownMenuItem>
              {isQuizFeatureEnabled() && (
                <DropdownMenuItem
                  className={isActive(quizRoute) ? "font-semibold" : ""}
                  onSelect={() => router.push(quizRoute)}
                >
                  Quiz
                </DropdownMenuItem>
              )}
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
            className="min-h-11 min-w-11"
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
