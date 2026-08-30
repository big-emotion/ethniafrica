/**
 * What the "Signaler une erreur" page owes a reader who chose it.
 *
 * It shipped with a Typeform embed and four paragraphs telling the reader to
 * use "le formulaire ci-dessous". The site's own CSP allows scripts from
 * `'self'` and a nonce and nothing else, so the embed script never ran: the
 * page had no iframe, no form, and no error — just the promise and blank
 * paper below it. That state survived because the only thing anyone tested
 * was that a link pointed here.
 *
 * The page now says where a report is actually taken. The moderation charter
 * is why it does not simply grow a form of its own: §2 opens on "a reader on
 * a fiche", and §3 refuses a context-free control because it hands the "which
 * part?" question back to the reader. A general form here would also file
 * flags under a target type the public register cannot show.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ReportErrorPage from "@/app/[lang]/report-error/page";
import { getLocalizedRoute } from "@/lib/routing";

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

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: "fr" }),
  usePathname: () => "/fr/report-error",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * The shell is stood down to its children on purpose. Its footer carries a
 * "Signaler une erreur" entry of its own, and a test that counted links across
 * the whole shell would pass on the footer's links while the page itself said
 * nothing — which is the shape of the failure this file exists to catch.
 */
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("Signaler une erreur", () => {
  // @req REQ-014
  it("carries no third-party embed the page's own CSP forbids", () => {
    const { container } = render(<ReportErrorPage />);

    expect(container.querySelector("[data-tf-live]")).toBeNull();
    expect(container.querySelector('script[src*="typeform"]')).toBeNull();
  });

  // @req REQ-014
  it("promises no form it does not show", () => {
    render(<ReportErrorPage />);

    // The old copy said "grâce au formulaire ci-dessous" over blank paper.
    expect(document.body.textContent).not.toMatch(/formulaire ci-dessous/i);
  });

  // @req REQ-014
  it("sends the reader where a report is actually taken", () => {
    render(<ReportErrorPage />);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toContain(getLocalizedRoute("fr", "explorerHub"));
    expect(hrefs).toContain("/fr/signalements");
  });

  // @req REQ-014
  it("tells the reader where the control is, so they can find it unaided", () => {
    render(<ReportErrorPage />);

    expect(document.body.textContent).toMatch(/Signaler/);
  });
});
