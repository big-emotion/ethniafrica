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

interface MobileNavBarProps {
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onSearchClick?: () => void;
}

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

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm lg:hidden"
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
            alt="EthniAfrica"
            width={26}
            height={26}
            className="object-contain"
          />
          <span className="font-display font-bold text-base leading-none">
            EthniAfrica
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
                className="h-8 px-2 text-xs font-semibold gap-1"
                aria-label="Navigation"
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
            className="h-8 w-8"
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
