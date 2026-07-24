"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute, getPageFromRoute, PageType } from "@/lib/routing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";
import { useSheetHistory } from "@/hooks/use-sheet-history";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onSearchClick?: () => void;
}

export const MobileMenu = ({
  open,
  onOpenChange,
  language,
  onSearchClick,
}: MobileMenuProps) => {
  const t = getTranslation(language);
  const pathname = usePathname();

  useSheetHistory({ open, onOpenChange });

  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");

  const currentPage = getPageFromRoute(pathname);
  const isActive = (pageType: PageType) => currentPage === pageType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[300px]">
        <SheetHeader>
          <SheetTitle>{t.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          <div className="flex flex-col gap-2">
            <Link href={`/${language}`} onClick={() => onOpenChange(false)}>
              <Button
                variant={
                  pathname === `/${language}` || pathname === "/"
                    ? "default"
                    : "ghost"
                }
                className="w-full justify-start"
              >
                Accueil
              </Button>
            </Link>
            <Link href={familiesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("families") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                Familles linguistiques
              </Button>
            </Link>
            <Link href={peoplesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("peoples") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                Peuples
              </Button>
            </Link>
            <Link href={countriesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("countries") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                Pays
              </Button>
            </Link>
          </div>

          <Separator />

          {onSearchClick && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                onSearchClick();
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          )}

          <Separator />

          <Link href={`/${language}/about`} onClick={() => onOpenChange(false)}>
            <Button variant="ghost" className="w-full justify-start">
              {t.whyThisSite}
            </Button>
          </Link>

          <Link
            href={`/${language}/doctrine`}
            onClick={() => onOpenChange(false)}
          >
            <Button variant="ghost" className="w-full justify-start">
              Doctrine
            </Button>
          </Link>

          <Link href="/docs/api/v2" onClick={() => onOpenChange(false)}>
            <Button variant="ghost" className="w-full justify-start">
              API
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};
