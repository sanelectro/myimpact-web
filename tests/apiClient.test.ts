import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../src/api/client";

describe("apiRequest errors", () => {
  it("surfaces the API error message instead of only the status code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: { code: "HTTP_422", message: "Document text could not be extracted." },
        }),
      }),
    );

    await expect(apiRequest("/api/v1/documents/import")).rejects.toThrow(
      "Document text could not be extracted.",
    );

    vi.unstubAllGlobals();
  });
});

describe("apiRequest empty responses", () => {
  it("resolves without parsing when the API returns 204 No Content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest<void>("/api/v1/goals/goal-1", { method: "DELETE" })).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });

  it("still parses JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"id":"goal-1"}', { status: 200 })));

    await expect(apiRequest<{ id: string }>("/api/v1/goals/goal-1")).resolves.toEqual({ id: "goal-1" });

    vi.unstubAllGlobals();
  });
});