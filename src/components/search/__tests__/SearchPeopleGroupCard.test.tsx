import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchPeopleGroupCard } from "../SearchPeopleGroupCard";
import type { PeopleGroup } from "@/lib/search/groupPeopleResults";
import { getPeopleRoute } from "@/lib/routing";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

const fulaniGroup: PeopleGroup = {
  type: "peopleGroup",
  peopleGroupId: "PGRP_FULANI",
  peopleGroupLabel: "Peul / Fulani",
  members: [
    { type: "people", id: "PPL_FULANI", name: "Peul" },
    { type: "people", id: "PPL_FULANI_MASSINA", name: "Peul du Massina" },
  ],
};

function renderCard(group: PeopleGroup, onNavigate?: () => void) {
  return render(
    <SearchPeopleGroupCard
      group={group}
      language="fr"
      onNavigate={onNavigate}
    />
  );
}

describe("SearchPeopleGroupCard", () => {
  // @req REQ-002
  it("shows the shared people-group label, not one member's own name", () => {
    renderCard(fulaniGroup);

    expect(screen.getByText("Peul / Fulani")).toBeInTheDocument();
  });

  // @req REQ-002
  it("links every split fiche to its own page", () => {
    renderCard(fulaniGroup);

    expect(screen.getByRole("link", { name: "Peul" })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_FULANI")
    );
    expect(
      screen.getByRole("link", { name: "Peul du Massina" })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_FULANI_MASSINA"));
  });

  // @req REQ-002
  it("names how many fiches the group holds", () => {
    renderCard(fulaniGroup);

    expect(screen.getByText(/2 fiches/i)).toBeInTheDocument();
  });

  // @req REQ-002
  it("notifies its host when a member link is activated", async () => {
    const onNavigate = vi.fn();
    renderCard(fulaniGroup, onNavigate);

    await userEvent.click(screen.getByRole("link", { name: "Peul" }));

    expect(onNavigate).toHaveBeenCalled();
  });

  // @req REQ-002
  it("scopes itself to the people accent, since a group is still peoples", () => {
    renderCard(fulaniGroup);
    const card = screen.getByTestId("search-people-group-card");

    expect(card.className).toContain("afh-accent-ocre");
  });
});
