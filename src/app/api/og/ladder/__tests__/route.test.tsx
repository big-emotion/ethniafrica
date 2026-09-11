import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageResponse } from "next/og";

import { GET } from "../route";
import { scaleLadder } from "@/lib/i18n/copy/scaleLadder";
import { WALLPAPER_FORMATS } from "@/lib/wallpaper/formats";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(function ImageResponseMock() {
    return new Response("image", { status: 200 });
  }),
}));

function request(query: Record<string, string>) {
  const url = new URL("https://ethniafrica.example/api/og/ladder");
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url);
}

const options = () =>
  vi.mocked(ImageResponse).mock.calls.at(-1)?.[1] as Record<string, unknown>;

describe("scale-ladder wallpaper route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-132
  it("renders every rung at every canvas the library offers", async () => {
    for (const rung of scaleLadder.fr.rungs) {
      for (const format of WALLPAPER_FORMATS) {
        const response = await GET(
          request({ rung: rung.id, format: format.id, lang: "fr" })
        );

        expect(response.status).toBe(200);
        expect(options()).toMatchObject({
          width: format.width,
          height: format.height,
        });
      }
    }
  });

  /**
   * The image carries the site's own type, so a stranger must not be able to
   * compose one from the query string — the same dignity rule the quiz score
   * card applies to an absurd score.
   */
  // @req REQ-132
  it("refuses an unknown rung or canvas rather than inventing a card", async () => {
    const unknownRung = await GET(
      request({ rung: "berceau", format: "square" })
    );
    const unknownFormat = await GET(
      request({ rung: "kongo", format: "billboard" })
    );

    expect(unknownRung.status).toBe(404);
    expect(unknownFormat.status).toBe(404);
    expect(ImageResponse).not.toHaveBeenCalled();
  });

  // @req REQ-145
  it("serves the rung in the requested locale, and falls back to French", async () => {
    await GET(request({ rung: "kongo", format: "square", lang: "en" }));
    const english = JSON.stringify(
      vi.mocked(ImageResponse).mock.calls.at(-1)?.[0]
    );

    await GET(request({ rung: "kongo", format: "square", lang: "es" }));
    const fallback = JSON.stringify(
      vi.mocked(ImageResponse).mock.calls.at(-1)?.[0]
    );

    expect(english).toContain("The Kongo kingdom");
    expect(fallback).toContain("Le royaume Kongo");
  });

  /**
   * A viewer who opens the image should get a file named for what it is, not
   * `route.png`: the library's whole point is that the image leaves the site.
   */
  // @req REQ-132
  it("names the downloaded file after its rung and canvas", async () => {
    await GET(request({ rung: "sanghana", format: "phone" }));

    expect(options().headers).toMatchObject({
      "Content-Disposition": expect.stringContaining(
        "ethniafrica-sanghana-phone.png"
      ),
    });
  });
});
