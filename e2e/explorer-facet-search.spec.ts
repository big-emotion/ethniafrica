import { expect, test } from "./support/fixtures";
import { getFacetRoute, type FacetKey } from "@/lib/hubs/facets";

const FACETS: ReadonlyArray<{
  key: FacetKey;
  label: RegExp;
  query: string;
}> = [
  { key: "countries", label: /rechercher un pays/i, query: "benin" },
  { key: "peoples", label: /rechercher un peuple/i, query: "akan" },
  {
    key: "families",
    label: /rechercher une famille linguistique/i,
    query: "mande",
  },
];

for (const facet of FACETS) {
  // @req REQ-114
  test(`@cross-viewport exposes a native GET search on the ${facet.key} facet`, async ({
    page,
  }) => {
    await page.goto(getFacetRoute("fr", facet.key), {
      waitUntil: "domcontentloaded",
    });

    const form = page.getByTestId("facet-filter-bar");
    const search = page.getByRole("searchbox", { name: facet.label });
    const primarySelect = form.locator("select").first();

    await expect(search).toBeVisible();
    await expect(form).toHaveAttribute("method", "get");
    await expect(form).toHaveAttribute(
      "action",
      getFacetRoute("fr", facet.key)
    );
    await expect(search).toHaveAttribute("name", "q");
    await expect(search).toHaveAttribute("type", "search");

    const documentFitsViewport = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
          document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.body.clientWidth
    );
    expect(documentFitsViewport).toBe(true);

    const [formBox, searchBox, selectBox] = await Promise.all([
      form.boundingBox(),
      search.boundingBox(),
      primarySelect.boundingBox(),
    ]);
    expect(formBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(selectBox).not.toBeNull();
    expect(formBox!.x).toBeGreaterThanOrEqual(0);
    expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1
    );
    expect(searchBox!.height).toBeGreaterThanOrEqual(44);
    expect(searchBox!.x).toBeGreaterThanOrEqual(0);
    expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1
    );

    const searchComesFirst = await search.evaluate(
      (node, select) =>
        Boolean(
          node.compareDocumentPosition(select as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      await primarySelect.elementHandle()
    );
    expect(searchComesFirst).toBe(true);

    if (page.viewportSize()!.width < 768) {
      expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(
        selectBox!.y + 1
      );
    }

    await search.fill(facet.query);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === facet.query, {
        waitUntil: "domcontentloaded",
      }),
      form.getByRole("button", { name: /filtrer|appliquer/i }).click(),
    ]);

    await expect(
      page.getByRole("searchbox", { name: facet.label })
    ).toHaveValue(facet.query);

    if (page.viewportSize()!.width === 430) {
      await page.setViewportSize({ width: 320, height: 812 });

      const narrowSearch = page.getByRole("searchbox", { name: facet.label });
      const narrowSelect = form.locator("select").first();
      await expect(narrowSearch).toBeVisible();
      const [narrowFormBox, narrowSearchBox, narrowSelectBox] =
        await Promise.all([
          form.boundingBox(),
          narrowSearch.boundingBox(),
          narrowSelect.boundingBox(),
        ]);

      expect(narrowFormBox).not.toBeNull();
      expect(narrowSearchBox).not.toBeNull();
      expect(narrowSelectBox).not.toBeNull();
      expect(narrowFormBox!.x).toBeGreaterThanOrEqual(0);
      expect(narrowFormBox!.x + narrowFormBox!.width).toBeLessThanOrEqual(321);
      expect(narrowSearchBox!.height).toBeGreaterThanOrEqual(44);
      expect(narrowSearchBox!.x).toBeGreaterThanOrEqual(0);
      expect(narrowSearchBox!.x + narrowSearchBox!.width).toBeLessThanOrEqual(
        321
      );
      expect(narrowSearchBox!.y + narrowSearchBox!.height).toBeLessThanOrEqual(
        narrowSelectBox!.y + 1
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
              document.documentElement.clientWidth &&
            document.body.scrollWidth <= document.body.clientWidth
        )
      ).toBe(true);
    }
  });
}
