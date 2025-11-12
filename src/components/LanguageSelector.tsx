"use client";

import { Language } from '@/types/ethnicity';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname } from 'next/navigation';
import { getPageFromRoute, getLocalizedRoute } from '@/lib/routing';
import Link from 'next/link';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages = [
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'fr' as Language, name: 'Français', flag: '🇫🇷' },
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
  { code: 'pt' as Language, name: 'Português', flag: '🇵🇹' },
];

export const LanguageSelector = ({ currentLang, onLanguageChange }: LanguageSelectorProps) => {
  const pathname = usePathname();
  const current = languages.find(l => l.code === currentLang);
  
  // Determine the target route for each language
  const getTargetRoute = (lang: Language): string => {
    const pageType = getPageFromRoute(pathname);
    
    // Preserve query params if any
    const searchParams = typeof window !== "undefined" 
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    const queryString = searchParams.toString();
    const querySuffix = queryString ? `?${queryString}` : "";
    
    if (pageType) {
      // If on a page with a slug (regions, countries, ethnicities)
      return getLocalizedRoute(lang, pageType) + querySuffix;
    } else if (pathname === "/" || pathname === "" || pathname.match(/^\/(en|fr|es|pt)$/)) {
      // If on homepage
      return `/${lang}${querySuffix}`;
    } else if (pathname.includes("/about")) {
      // If on about page
      return `/${lang}/about${querySuffix}`;
    }
    
    // Default to homepage
    return `/${lang}${querySuffix}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{current?.flag} {current?.name}</span>
          <span className="sm:hidden">{current?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card">
        {languages.map(lang => {
          const targetRoute = getTargetRoute(lang.code);
          return (
            <DropdownMenuItem key={lang.code} asChild>
              <Link href={targetRoute} onClick={() => onLanguageChange(lang.code)} className="cursor-pointer gap-2 flex items-center">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
