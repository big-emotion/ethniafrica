"use client";

import { Share2, Facebook, Twitter, Linkedin, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Language } from "@/types/ethnicity";
import { getLocalizedRoute } from "@/lib/routing";

interface ShareButtonProps {
  type: "region" | "country" | "ethnicity";
  name: string;
  language: Language;
  regionKey?: string;
}

export const ShareButton = ({ type, name, language, regionKey }: ShareButtonProps) => {
  const getShareUrl = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    
    if (type === "region") {
      const route = getLocalizedRoute(language, "regions");
      // For regions, use regionKey (like "afrique_de_l_est") not the name
      return `${baseUrl}${route}?region=${encodeURIComponent(regionKey || name)}`;
    } else if (type === "country") {
      const route = getLocalizedRoute(language, "countries");
      return `${baseUrl}${route}?country=${encodeURIComponent(name)}`;
    } else {
      const route = getLocalizedRoute(language, "ethnicities");
      return `${baseUrl}${route}?ethnicity=${encodeURIComponent(name)}`;
    }
  };

  const shareUrl = getShareUrl();
  const shareText = `${name} - African Ethnicities Dictionary`;

  const handleShare = async (platform: string) => {
    const url = shareUrl;
    
    if (platform === "native" && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: shareText,
          url: url,
        });
        return;
      } catch (err) {
        // User cancelled or error
      }
    }

    let shareLink = "";
    switch (platform) {
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        // LinkedIn Share API - opens a popup to share the URL
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case "copy":
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          // You could add a toast notification here
          return;
        }
        break;
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "width=600,height=400");
    }
  };

  const t = {
    share: language === "en" ? "Share" : language === "fr" ? "Partager" : language === "es" ? "Compartir" : "Compartilhar",
    shareNative: language === "en" ? "Share..." : language === "fr" ? "Partager..." : language === "es" ? "Compartir..." : "Compartilhar...",
    copyLink: language === "en" ? "Copy link" : language === "fr" ? "Copier le lien" : language === "es" ? "Copiar enlace" : "Copiar link",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t.share}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card">
        {typeof navigator !== "undefined" && navigator.share && (
          <DropdownMenuItem onClick={() => handleShare("native")} className="cursor-pointer gap-2">
            <Share2 className="h-4 w-4" />
            <span>{t.shareNative}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleShare("facebook")} className="cursor-pointer gap-2">
          <Facebook className="h-4 w-4" />
          <span>Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")} className="cursor-pointer gap-2">
          <Twitter className="h-4 w-4" />
          <span>Twitter</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("linkedin")} className="cursor-pointer gap-2">
          <Linkedin className="h-4 w-4" />
          <span>LinkedIn</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("copy")} className="cursor-pointer gap-2">
          <LinkIcon className="h-4 w-4" />
          <span>{t.copyLink}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

