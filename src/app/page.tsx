"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";

export default function Home() {
  const router = useRouter();
  const { language } = useLanguage();

  useEffect(() => {
    // Redirect to /{lang} format
    router.replace(`/${language}`);
  }, [language, router]);

  return (
    <div className="min-h-screen gradient-earth flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
