"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "./MobileMenu";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import Image from "next/image";
import Link from "next/link";

interface MobileNavBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const MobileNavBar = ({
  language,
  onLanguageChange,
}: MobileNavBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = getTranslation(language);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm lg:hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMenuOpen(true)}
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <Link
          href={`/${language}`}
          className="flex items-center gap-2 flex-1 justify-center"
        >
          <Image
            src="/africa.png"
            alt="Africa"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="font-display font-bold text-lg">{t.title}</span>
        </Link>
        <div className="w-9" /> {/* Spacer pour centrer le titre */}
        <MobileMenu
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          language={language}
          onLanguageChange={onLanguageChange}
        />
      </div>
    </div>
  );
};
