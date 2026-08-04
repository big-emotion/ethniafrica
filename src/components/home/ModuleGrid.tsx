"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/home/ModuleCard";
import {
  getModuleCategories,
  type HomeModule,
  type ModuleCategory,
} from "@/lib/accessModeHubs";

type ModuleFilter = "tout" | ModuleCategory;

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  explorer: "Explorer",
  comprendre: "Comprendre",
  jouer: "Jouer",
};

interface ModuleGridProps {
  modules: HomeModule[];
}

// @req FR92
export function ModuleGrid({ modules }: ModuleGridProps) {
  const categories = getModuleCategories();
  const [activeFilter, setActiveFilter] = useState<ModuleFilter>("tout");

  const visibleModules = modules.filter(
    (module) => activeFilter === "tout" || module.category === activeFilter
  );

  return (
    <div>
      <div
        role="group"
        aria-label="Filtrer les modules"
        className="mb-6 flex flex-wrap gap-2"
      >
        <Button
          type="button"
          variant={activeFilter === "tout" ? "default" : "outline"}
          size="sm"
          aria-pressed={activeFilter === "tout"}
          onClick={() => setActiveFilter("tout")}
          className="rounded-full"
        >
          Tout
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            type="button"
            variant={activeFilter === category ? "default" : "outline"}
            size="sm"
            aria-pressed={activeFilter === category}
            onClick={() => setActiveFilter(category)}
            className="rounded-full"
          >
            {CATEGORY_LABELS[category]}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}
