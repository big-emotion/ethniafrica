"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute, getPageFromRoute } from "@/lib/routing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";
import { Separator } from "@/components/ui/separator";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const MobileMenu = ({
  open,
  onOpenChange,
  language,
  onLanguageChange,
}: MobileMenuProps) => {
  const t = getTranslation(language);
  const pathname = usePathname();

  const regionsRoute = getLocalizedRoute(language, "regions");
  const countriesRoute = getLocalizedRoute(language, "countries");
  const ethnicitiesRoute = getLocalizedRoute(language, "ethnicities");

  const currentPage = getPageFromRoute(pathname);
  const isActive = (pageType: "regions" | "countries" | "ethnicities") => {
    return currentPage === pageType;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[300px]">
        <SheetHeader>
          <SheetTitle>{t.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          {/* Navigation links */}
          <div className="flex flex-col gap-2">
            <Link href={regionsRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("regions") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {t.regions}
              </Button>
            </Link>
            <Link href={countriesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("countries") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {t.byCountry}
              </Button>
            </Link>
            <Link href={ethnicitiesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("ethnicities") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {t.byEthnicity}
              </Button>
            </Link>
          </div>

          <Separator />

          {/* About link */}
          <Link href="/about" onClick={() => onOpenChange(false)}>
            <Button variant="ghost" className="w-full justify-start">
              {t.whyThisSite}
            </Button>
          </Link>

          <Separator />

          {/* Language selector */}
          <div className="px-2">
            <LanguageSelector
              currentLang={language}
              onLanguageChange={(lang) => {
                onLanguageChange(lang);
                // Close menu after language change
                setTimeout(() => onOpenChange(false), 100);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
