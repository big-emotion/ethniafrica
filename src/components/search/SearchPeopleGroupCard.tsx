"use client";

import Link from "next/link";

import {
  SEARCH_ENTITY_ACCENT,
  SearchEntityMark,
} from "@/components/search/searchEntityAccent";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CHARTER_FOCUS_RING,
  CHARTER_HOVER_LIFT,
} from "@/components/ui/charter-motion";
import { getPeopleRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";
import type { PeopleGroup } from "@/lib/search/groupPeopleResults";
import type { Language } from "@/types/shared";

/**
 * A people-group card: several split fiches (ETNI-1391) shown as one result.
 *
 * Unlike SearchResultCard, this card carries no single fiche href — it is a
 * group, not a destination — so every member gets its own link rather than
 * one stretched over the card.
 */

export interface SearchPeopleGroupCardProps {
  group: PeopleGroup;
  language: Language;
  /** Fired when any member link inside the card is activated — a modal closes with it. */
  onNavigate?: () => void;
  className?: string;
}

// @req REQ-002
export function SearchPeopleGroupCard({
  group,
  language,
  onNavigate,
  className,
}: SearchPeopleGroupCardProps) {
  const accent = SEARCH_ENTITY_ACCENT.people;

  return (
    <Card
      data-testid="search-people-group-card"
      data-people-group-id={group.peopleGroupId}
      className={cn(
        "relative p-4 md:p-5",
        accent.accentScopeClassName,
        CHARTER_HOVER_LIFT,
        className
      )}
    >
      <h3 className="font-afh-display text-afh-small font-semibold text-afh-text">
        {group.peopleGroupLabel}
      </h3>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5">
          <SearchEntityMark type="people" />
          <Badge variant="secondary" className="text-afh-caption">
            {accent.label}
          </Badge>
        </span>
        <span className="text-afh-caption text-afh-fg-muted">
          {group.members.length} fiches
        </span>
      </div>

      <ul
        className="mt-2 flex flex-wrap items-center gap-2"
        aria-label="Fiches du groupe"
      >
        {group.members.map((member) => (
          <li key={member.id}>
            <Link
              href={getPeopleRoute(language, member.id)}
              onClick={onNavigate}
              className={cn("rounded-full", CHARTER_FOCUS_RING)}
            >
              <Badge variant="outline" className="text-afh-caption">
                {member.name}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
