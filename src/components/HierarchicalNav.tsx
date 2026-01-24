"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Languages, Users, MapPin, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { getAllLanguageFamilies, getPeoples } from "@/lib/afrikLoader";
import type {
  LanguageFamilySummary,
  PeopleSummary,
  HierarchyNode,
} from "@/types/afrik-frontend";

export type HierarchySelectionType = "family" | "people" | "country";

interface HierarchicalNavProps {
  onSelect: (type: HierarchySelectionType, id: string) => void;
  selectedId?: string;
  selectedType?: HierarchySelectionType;
  className?: string;
}

interface FamilyNode extends LanguageFamilySummary {
  peoples?: PeopleSummary[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

export const HierarchicalNav = ({
  onSelect,
  selectedId,
  selectedType,
  className,
}: HierarchicalNavProps) => {
  const [families, setFamilies] = useState<FamilyNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState<Set<string>>(
    new Set()
  );

  // Load families on mount
  useEffect(() => {
    const loadFamilies = async () => {
      setIsLoading(true);
      try {
        const allFamilies = await getAllLanguageFamilies();
        setFamilies(
          allFamilies.map((f) => ({
            ...f,
            peoples: undefined,
            isLoading: false,
            isExpanded: false,
          }))
        );
      } catch (error) {
        console.error("Failed to load families:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFamilies();
  }, []);

  // Load peoples for a family when expanded
  const loadPeoplesForFamily = useCallback(async (familyId: string) => {
    setLoadingFamilies((prev) => new Set(prev).add(familyId));

    try {
      // Get all peoples and filter by family
      const result = await getPeoples({ perPage: 1000 });
      const familyPeoples = result.data.filter(
        (p) => p.languageFamilyId === familyId
      );

      setFamilies((prev) =>
        prev.map((f) =>
          f.id === familyId
            ? { ...f, peoples: familyPeoples, isLoading: false }
            : f
        )
      );
    } catch (error) {
      console.error(`Failed to load peoples for family ${familyId}:`, error);
    } finally {
      setLoadingFamilies((prev) => {
        const next = new Set(prev);
        next.delete(familyId);
        return next;
      });
    }
  }, []);

  // Handle accordion expansion
  const handleAccordionChange = (value: string[]) => {
    setExpandedFamilies(value);

    // Load peoples for newly expanded families
    value.forEach((familyId) => {
      const family = families.find((f) => f.id === familyId);
      if (family && !family.peoples && !loadingFamilies.has(familyId)) {
        loadPeoplesForFamily(familyId);
      }
    });
  };

  // Handle selection
  const handleFamilyClick = (familyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect("family", familyId);
  };

  const handlePeopleClick = (peopleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect("people", peopleId);
  };

  const handleCountryClick = (countryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect("country", countryId);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Accordion
        type="multiple"
        value={expandedFamilies}
        onValueChange={handleAccordionChange}
        className="w-full"
      >
        {families.map((family) => (
          <AccordionItem
            key={family.id}
            value={family.id}
            className="border-none"
          >
            <AccordionTrigger
              className={cn(
                "py-2 px-3 hover:bg-muted/50 rounded-md hover:no-underline",
                selectedType === "family" &&
                  selectedId === family.id &&
                  "bg-primary/10"
              )}
            >
              <div
                className="flex items-center gap-2 flex-1 text-left"
                onClick={(e) => handleFamilyClick(family.id, e)}
              >
                <Languages className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium truncate">{family.nameFr}</span>
                {family.peopleCount !== undefined && (
                  <span className="text-xs text-muted-foreground ml-auto mr-2">
                    ({family.peopleCount})
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="ml-4 border-l pl-2 space-y-1">
                {loadingFamilies.has(family.id) ? (
                  <div className="flex items-center gap-2 py-2 px-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : family.peoples && family.peoples.length > 0 ? (
                  family.peoples.map((people) => (
                    <div key={people.id} className="space-y-1">
                      <button
                        onClick={(e) => handlePeopleClick(people.id, e)}
                        className={cn(
                          "w-full flex items-center gap-2 py-1.5 px-3 hover:bg-muted/50 rounded-md text-left transition-colors",
                          selectedType === "people" &&
                            selectedId === people.id &&
                            "bg-primary/10"
                        )}
                      >
                        <Users className="h-4 w-4 text-primary/70 shrink-0" />
                        <span className="text-sm truncate">
                          {people.nameMain}
                        </span>
                        {people.currentCountries.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            ({people.currentCountries.length})
                          </span>
                        )}
                      </button>
                      {/* Countries under each people */}
                      {people.currentCountries.length > 0 && (
                        <div className="ml-6 border-l pl-2 space-y-0.5">
                          {people.currentCountries
                            .slice(0, 5)
                            .map((countryId) => (
                              <button
                                key={`${people.id}-${countryId}`}
                                onClick={(e) =>
                                  handleCountryClick(countryId, e)
                                }
                                className={cn(
                                  "w-full flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded text-left transition-colors",
                                  selectedType === "country" &&
                                    selectedId === countryId &&
                                    "bg-primary/10"
                                )}
                              >
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {countryId}
                                </span>
                              </button>
                            ))}
                          {people.currentCountries.length > 5 && (
                            <span className="text-xs text-muted-foreground pl-2">
                              +{people.currentCountries.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    No peoples found
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default HierarchicalNav;
