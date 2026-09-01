import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/[lang]/error";
import NotFound from "@/app/[lang]/not-found";
import ForbiddenPageComponent from "@/app/forbidden/page-component";
import { LoadingState } from "@/components/ui/LoadingState";
import ApiDocsLayout from "@/app/docs/api/layout";
import { EmptyState } from "@/components/ui/EmptyState";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="global-page-layout" className="gradient-earth">
      <header data-testid="site-header" />
      {children}
      <footer data-testid="site-footer" />
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: "fr" }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue(undefined) },
  }),
}));

// StateMedallion renders DottedContinent, which reaches for a 2D canvas
// context. Mocking getContext to return null makes its effect early-return
// safely under happy-dom without needing to stub IntersectionObserver /
// ResizeObserver — the animation itself is out of scope here.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("Error state ([lang]/error.tsx)", () => {
  const mockError = new Error("boom") as Error & { digest?: string };
  mockError.digest = "abc123";

  // @req REQ-099
  it("renders exactly one medallion", () => {
    const { container } = render(
      <ErrorPage error={mockError} reset={() => {}} />
    );
    expect(
      container.querySelectorAll('[data-testid="state-medallion"]')
    ).toHaveLength(1);
  });

  // @req REQ-099
  it("keeps its copy at 25 words or fewer", () => {
    const { container } = render(
      <ErrorPage error={mockError} reset={() => {}} />
    );
    const copy = container.querySelector('[data-testid="state-copy"]');
    expect(copy).toBeTruthy();
    expect(wordCount(copy!.textContent ?? "")).toBeLessThanOrEqual(25);
  });

  // @req REQ-099
  it("exposes exactly one primary CTA", () => {
    const { container } = render(
      <ErrorPage error={mockError} reset={() => {}} />
    );
    expect(container.querySelectorAll('[data-cta="primary"]')).toHaveLength(1);
  });

  // @req REQ-099
  it("keeps the reset affordance", () => {
    const reset = vi.fn();
    render(<ErrorPage error={mockError} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("404 state ([lang]/not-found.tsx)", () => {
  // @req REQ-099
  it("renders exactly one medallion", () => {
    const { container } = render(<NotFound />);
    expect(
      container.querySelectorAll('[data-testid="state-medallion"]')
    ).toHaveLength(1);
  });

  // @req REQ-099
  it("keeps its copy at 25 words or fewer", () => {
    const { container } = render(<NotFound />);
    const copy = container.querySelector('[data-testid="state-copy"]');
    expect(copy).toBeTruthy();
    expect(wordCount(copy!.textContent ?? "")).toBeLessThanOrEqual(25);
  });

  // @req REQ-099
  it("exposes exactly one primary CTA", () => {
    const { container } = render(<NotFound />);
    expect(container.querySelectorAll('[data-cta="primary"]')).toHaveLength(1);
  });

  // @req REQ-099
  it("says why the page is missing, and spells out no corpus key", () => {
    const { container } = render(<NotFound />);

    expect(container.textContent).toMatch(/pas encore publiée/i);
    expect(container.textContent).not.toMatch(/PPL_|FLG_/);
  });

  // @req REQ-099
  it("still offers the report-a-broken-link affordance", () => {
    render(<NotFound />);
    expect(screen.getByText(/signaler une url cassée/i)).toBeTruthy();
  });
});

describe("403 state (forbidden/page-component.tsx)", () => {
  // @req REQ-099
  it("renders exactly one medallion", () => {
    const { container } = render(<ForbiddenPageComponent />);
    expect(
      container.querySelectorAll('[data-testid="state-medallion"]')
    ).toHaveLength(1);
  });

  // @req REQ-099
  it("keeps its copy at 25 words or fewer", () => {
    const { container } = render(<ForbiddenPageComponent />);
    const copy = container.querySelector('[data-testid="state-copy"]');
    expect(copy).toBeTruthy();
    expect(wordCount(copy!.textContent ?? "")).toBeLessThanOrEqual(25);
  });

  // @req REQ-099
  it("exposes exactly one primary CTA", () => {
    const { container } = render(<ForbiddenPageComponent />);
    expect(container.querySelectorAll('[data-cta="primary"]')).toHaveLength(1);
  });

  // @req REQ-099
  it("renders dignified French copy, no raw 403/Access Denied", () => {
    const { container } = render(<ForbiddenPageComponent />);
    expect(container.textContent).not.toMatch(/Access Denied/i);
    expect(container.textContent).not.toContain("!");
  });
});

describe("Empty state (EmptyState)", () => {
  // @req REQ-099
  it("renders exactly one medallion", () => {
    const { container } = render(
      <EmptyState message="Aucun résultat trouvé pour cette recherche." />
    );
    expect(
      container.querySelectorAll('[data-testid="state-medallion"]')
    ).toHaveLength(1);
  });

  // @req REQ-099
  it("keeps its copy at 25 words or fewer", () => {
    const { container } = render(
      <EmptyState message="Aucun résultat trouvé pour cette recherche." />
    );
    const copy = container.querySelector('[data-testid="state-copy"]');
    expect(copy).toBeTruthy();
    expect(wordCount(copy!.textContent ?? "")).toBeLessThanOrEqual(25);
  });

  // @req REQ-099
  it("exposes exactly one primary CTA for the search variant", () => {
    const { container } = render(
      <EmptyState message="Aucun résultat trouvé." variant="search" lang="fr" />
    );
    expect(container.querySelectorAll('[data-cta="primary"]')).toHaveLength(1);
  });

  // @req REQ-099
  it("still applies afh-bg-warm and afh-text-soft token classes", () => {
    const { container } = render(<EmptyState message="Rien" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-afh-bg-warm");
    expect(el.className).toContain("text-afh-text-soft");
  });
});

describe("Loading state (LoadingState — used as a Suspense fallback)", () => {
  // REQ-046 forbids a route-level src/app/[lang]/loading.tsx (it would wrap
  // every localized route in one global Suspense boundary). LoadingState is
  // the charter-token equivalent, passed explicitly to <Suspense fallback>.
  // @req REQ-099
  it("does not reintroduce a global [lang] loading boundary", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/app/[lang]/loading.tsx"))
    ).toBe(false);
  });

  // @req REQ-099
  it("renders token-based skeletons, not a medallion", () => {
    const { container } = render(<LoadingState />);
    expect(
      container.querySelectorAll('[data-testid="state-medallion"]')
    ).toHaveLength(0);
    const skeletons = container.querySelectorAll(".afh-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
    skeletons.forEach((el) => {
      expect(el.className).toContain("bg-afh-bg-warm");
    });
  });

  // @req REQ-099
  it("reserves a fixed-height shell to avoid layout shift", () => {
    const { container } = render(<LoadingState />);
    const shell = container.querySelector('[data-testid="loading-state"]');
    expect(shell).toBeTruthy();
    expect(shell!.className).toMatch(/min-h-\[60vh\]/);
  });
});

describe("Developer portal shell (/docs/api)", () => {
  // @req REQ-099
  it("keeps its parchment surface inside the global site shell", () => {
    const { container } = render(
      <ApiDocsLayout>
        <div data-testid="child">content</div>
      </ApiDocsLayout>
    );
    const shell = container.querySelector('[data-testid="docs-api-shell"]');
    expect(shell).toBeTruthy();
    expect(shell!.className).not.toMatch(/gradient-earth/);
    expect(shell!.className).toMatch(/bg-afh-bg\b/);
    expect(screen.getByTestId("site-header")).toBeTruthy();
    expect(screen.getByTestId("site-footer")).toBeTruthy();
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  // @req REQ-099
  it("leaves the Swagger container class list untouched (source snapshot)", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/docs/api/v2/page.tsx"),
      "utf8"
    );
    expect(source).toContain('className="swagger-ui-wrapper"');
    expect(source).toMatch(/<SwaggerUI spec=\{spec\} \/>/);
  });
});
