import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div with the afh-bg-warm background class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain("bg-afh-bg-warm");
  });

  it("applies shimmer class by default", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("afh-shimmer");
  });

  it("does not render a centered full-page spinner element", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('[data-testid="spinner"]')).toBeNull();
  });

  it("accepts and merges extra className", () => {
    const { container } = render(<Skeleton className="h-8 w-full" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("h-8");
    expect(el.className).toContain("w-full");
  });
});
