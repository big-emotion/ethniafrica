import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

const UI_DIR = join(process.cwd(), "src/components/ui");

/** Renders children inside an accent-scoped wrapper (ETNI-798 §4 scoping pattern). */
function renderInAccentScope(ui: React.ReactElement) {
  return render(
    <div
      data-testid="accent-scope"
      style={
        {
          "--accent": "var(--afh-cat-teal)",
          "--accent-tint": "var(--afh-cat-teal-tint)",
        } as React.CSSProperties
      }
    >
      {ui}
    </div>
  );
}

// Legacy shadcn semantic-color utilities that must never appear on a
// restyled charter primitive — every color must resolve through --afh-*.
const LEGACY_COLOR_CLASS = new RegExp(
  String.raw`(?<!-)\b(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|accent(?:-foreground)?|destructive(?:-foreground)?|input|ring)\b`
);
const RAW_HEX_OR_RGB = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/;
const LEGACY_RADIUS_CLASS =
  /\brounded(?:-[tlrb][lr]?)?-(?:sm|md|lg|xl|2xl|3xl|none|\[[^\]]+\])(?!\w)/;

const IN_SCOPE_FILES = [
  "button.tsx",
  "input.tsx",
  "textarea.tsx",
  "select.tsx",
  "checkbox.tsx",
  "radio-group.tsx",
  "card.tsx",
  "alert.tsx",
  "accordion.tsx",
  "dialog.tsx",
  "drawer.tsx",
  "badge.tsx",
  "tabs.tsx",
  "pagination.tsx",
  "skeleton.tsx",
];

function readPrimitiveSource(file: string): string {
  return readFileSync(join(UI_DIR, file), "utf8");
}

describe("charter primitive tokenization (ETNI-799 · FR104 §4-§5)", () => {
  describe.each(IN_SCOPE_FILES)("%s", (file) => {
    // @req REQ-091
    it("uses no legacy shadcn semantic-color utility", () => {
      const source = readPrimitiveSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => LEGACY_COLOR_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("contains no raw hex/rgb/hsl color literal", () => {
      const source = readPrimitiveSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => RAW_HEX_OR_RGB.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("uses no legacy (non-charter) radius scale", () => {
      const source = readPrimitiveSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => LEGACY_RADIUS_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("consumes at least one --afh-* charter token", () => {
      const source = readPrimitiveSource(file);
      expect(source).toMatch(/afh-|--accent/);
    });
  });

  describe("focus-visible ring resolves to the charter §9 token", () => {
    // @req REQ-091
    it.each([
      "button.tsx",
      "input.tsx",
      "textarea.tsx",
      "select.tsx",
      "checkbox.tsx",
      "radio-group.tsx",
      "tabs.tsx",
      "dialog.tsx",
    ])("%s applies --afh-ring-focus on focus-visible", (file) => {
      const source = readPrimitiveSource(file);
      // Either inline, or via the shared CHARTER_FOCUS_RING util (ETNI-837 scope).
      expect(source).toMatch(
        /focus-visible:shadow-\[var\(--afh-ring-focus\)\]|CHARTER_FOCUS_RING/
      );
    });
  });

  describe("rendered primitives under an accent scope", () => {
    // @req REQ-091
    it("Button default/lg/icon sizes expose a >=44px hit area", () => {
      renderInAccentScope(
        <>
          <Button>Voir la fiche</Button>
          <Button size="lg">Explorer</Button>
          <Button size="icon" aria-label="Rechercher">
            +
          </Button>
        </>
      );
      for (const name of ["Voir la fiche", "Explorer", "Rechercher"]) {
        const el = screen.getByRole("button", { name });
        expect(el.className).toMatch(/(?:^|\s)(?:min-)?h-11(?:\s|$)/);
      }
    });

    // @req REQ-091
    it("Input exposes a >=44px hit area and no literal color class", () => {
      renderInAccentScope(<Input aria-label="Recherche" />);
      const el = screen.getByRole("textbox");
      expect(el.className).toMatch(/(?:^|\s)h-11(?:\s|$)/);
      expect(el.className).not.toMatch(LEGACY_COLOR_CLASS);
    });

    // @req REQ-091
    it("TabsTrigger exposes a >=44px minimum hit area", () => {
      renderInAccentScope(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Aperçu</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Contenu</TabsContent>
        </Tabs>
      );
      const trigger = screen.getByRole("tab", { name: "Aperçu" });
      expect(trigger.className).toMatch(/min-h-11/);
    });

    // @req REQ-091
    it("PaginationLink (default size) exposes a >=44px hit area", () => {
      renderInAccentScope(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#" aria-label="Page 1">
                1
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
      const link = screen.getByRole("link", { name: "Page 1" });
      expect(link.className).toMatch(/(?:^|\s)h-11(?:\s|$)/);
    });

    // @req REQ-091
    it("Badge/chip renders with pill radius (rounded-full)", () => {
      renderInAccentScope(<Badge>FLG_BANTU</Badge>);
      expect(screen.getByText("FLG_BANTU").className).toMatch(/rounded-full/);
    });

    // @req REQ-091
    it("Card/Alert titles apply Fraunces 900 display styling", () => {
      renderInAccentScope(
        <>
          <Card>
            <CardHeader>
              <CardTitle>Peuple Yoruba</CardTitle>
            </CardHeader>
            <CardContent>Détails</CardContent>
          </Card>
          <Alert>
            <AlertTitle>Attention</AlertTitle>
            <AlertDescription>Détails</AlertDescription>
          </Alert>
        </>
      );
      for (const text of ["Peuple Yoruba", "Attention"]) {
        const el = screen.getByText(text);
        expect(el.className).toMatch(/font-afh-display/);
        expect(el.className).toMatch(/font-black/);
      }
    });

    // @req REQ-091
    it("Checkbox and RadioGroupItem carry the charter §9 focus ring class", () => {
      renderInAccentScope(
        <>
          <Checkbox aria-label="Accepter" />
          <RadioGroup>
            <RadioGroupItem value="a" aria-label="Option A" />
          </RadioGroup>
        </>
      );
      expect(screen.getByRole("checkbox").className).toMatch(
        /focus-visible:shadow-\[var\(--afh-ring-focus\)\]/
      );
      expect(screen.getByRole("radio").className).toMatch(
        /focus-visible:shadow-\[var\(--afh-ring-focus\)\]/
      );
    });

    // @req REQ-091
    it("Skeleton resolves its shimmer surface through --afh-* tokens", () => {
      renderInAccentScope(<Skeleton data-testid="skel" className="h-4 w-24" />);
      const el = screen.getByTestId("skel");
      expect(el.className).toMatch(/bg-afh-/);
      expect(el.className).not.toMatch(LEGACY_COLOR_CLASS);
    });
  });
});
