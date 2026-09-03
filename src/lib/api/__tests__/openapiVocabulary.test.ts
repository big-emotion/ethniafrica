import { describe, expect, it } from "vitest";

import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import { OPENAPI_V2_TAGS, apiTagLabel } from "@/lib/api/openapiV2Tags";
import { PRODUCT_NAME } from "@/lib/brand";

const spec = swaggerSpecV2 as {
  info: { title: string; contact?: { name?: string } };
  tags: { name: string }[];
};

describe("the vocabulary the public spec exposes", () => {
  // The spec is read by people outside the project, and it called the product
  // "Ethniafrique Atlas" — a name it no longer carries anywhere else. The name
  // is read from brand.ts so there is one answer to what this thing is called.
  // @req REQ-099
  it("calls the product by the name the rest of the product uses", () => {
    expect(spec.info.title).toContain(PRODUCT_NAME);
    expect(spec.info.contact?.name).toBe(PRODUCT_NAME);
    expect(`${spec.info.title} ${spec.info.contact?.name}`).not.toMatch(
      /Ethniafrique/i
    );
  });

  // "Module #0" is the internal numbering of the Source Transparency Fabric.
  // It named a real family of three endpoints — /sources, /confidence,
  // /doctrine — but a reader opening Swagger has no module numbering to map it
  // onto, and the API landing page rendered it as a pill saying "Module #0".
  // Internal numbering is a project's private vocabulary; a tag is a heading a
  // stranger reads.
  // @req REQ-099
  it("heads no resource family with an internal module number", () => {
    for (const tag of spec.tags) {
      expect(
        apiTagLabel(tag.name),
        `${tag.name} exposes module numbering`
      ).not.toMatch(/module\s*#?\d/i);
    }
  });

  // The extracted module and the served document are the same list; the
  // landing page reads the first and a client reads the second.
  // @req REQ-099
  it("serves exactly the tags the shared module declares", () => {
    expect(spec.tags.map((tag) => tag.name)).toEqual(
      OPENAPI_V2_TAGS.map((tag) => tag.name)
    );
  });
});
