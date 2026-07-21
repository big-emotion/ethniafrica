import { describe, it, expect } from "vitest";
import { findBreakingChanges, compareSchemas } from "../openapi-diff";

describe("openapi-diff", () => {
  describe("findBreakingChanges", () => {
    it("should detect removed endpoints", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
          },
          "/api/v2/posts": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain("Removed endpoint: GET /api/v2/posts");
    });

    it("should detect removed HTTP methods", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
            post: { responses: { "201": { description: "Created" } } },
          },
        },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain("Removed endpoint: POST /api/v2/users");
    });

    it("should return empty array when no breaking changes", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
          },
          "/api/v2/posts": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(0);
    });

    it("should detect removed schema properties", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
              },
            },
          },
        },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain(
        "Removed property 'email' from schema 'User'"
      );
    });

    it("should detect removed schemas", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: { type: "object", properties: { id: { type: "string" } } },
            Post: { type: "object", properties: { id: { type: "string" } } },
          },
        },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: { type: "object", properties: { id: { type: "string" } } },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain("Removed schema: Post");
    });

    it("should detect narrowed enum types", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: "string",
              enum: ["active", "inactive", "pending"],
            },
          },
        },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: "string",
              enum: ["active", "inactive"],
            },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain("Narrowed enum in schema 'Status'");
      expect(changes[0]).toContain("pending");
    });

    it("should handle missing paths gracefully", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/api/v2/users": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(0);
    });

    it("should handle missing components gracefully", () => {
      const baseline = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const current = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: { type: "object" },
          },
        },
      };

      const changes = findBreakingChanges(baseline, current);
      expect(changes).toHaveLength(0);
    });
  });

  describe("compareSchemas", () => {
    it("should detect removed properties in nested objects", () => {
      const baselineSchema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  street: { type: "string" },
                  city: { type: "string" },
                },
              },
            },
          },
        },
      };

      const currentSchema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  street: { type: "string" },
                },
              },
            },
          },
        },
      };

      const changes = compareSchemas(baselineSchema, currentSchema, "Root");
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain("city");
    });

    it("should detect removed properties in arrays of objects", () => {
      const baselineSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
      };

      const currentSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      };

      const changes = compareSchemas(baselineSchema, currentSchema, "Items");
      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain("name");
    });

    it("should handle type changes", () => {
      const baselineSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      };

      const currentSchema = {
        type: "object",
        properties: {
          id: { type: "number" },
        },
      };

      const changes = compareSchemas(baselineSchema, currentSchema, "Entity");
      expect(changes.length).toBeGreaterThan(0);
    });
  });
});
