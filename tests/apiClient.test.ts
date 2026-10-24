import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../src/api/client";
import { updateAdminCompany } from "../src/api/myImpact";

vi.mock("../src/auth/auth", () => ({
  getAccessToken: () => "test-access-token",
  getCurrentUserId: () => "user-test",
  refreshSession: vi.fn().mockResolvedValue(null),
}));

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

describe("company updates", () => {
  it("sends a PATCH request to update a company name", async () => {
    const updatedCompany = {
      id: "company/1",
      name: "Acme Global",
      user_count: 3,
      created_at: "2026-10-24T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updatedCompany), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateAdminCompany("company/1", { name: "Acme Global" }),
    ).resolves.toEqual(updatedCompany);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/admin/companies/company%2F1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Acme Global" }),
      }),
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

  describe("apiRequest authentication", () => {
    it("sends the access token as a bearer credential", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('{"id":"goal-1"}', { status: 200 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await apiRequest<{ id: string }>("/api/v1/goals");

      const headers = new Headers(fetchMock.mock.calls[0][1].headers);
      expect(headers.get("Authorization")).toBe("Bearer test-access-token");

      vi.unstubAllGlobals();
    });
  });

  it("still parses JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"id":"goal-1"}', { status: 200 })));

    await expect(apiRequest<{ id: string }>("/api/v1/goals/goal-1")).resolves.toEqual({ id: "goal-1" });

    vi.unstubAllGlobals();
  });
});