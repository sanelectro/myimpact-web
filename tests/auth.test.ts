// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAccessToken,
  getAuthSession,
  refreshSession,
  registerAccount,
  signIn,
  signOut,
} from "../src/auth/auth";

const authPayload = {
  access_token: "short-lived-access-token",
  expires_in: 900,
  token_type: "bearer",
  user: {
    id: "user-1",
    name: "Alex Example",
    email: "alex@example.test",
    role: "Engineer",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("authentication sessions", () => {
  it("registers with an organization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(authPayload), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await registerAccount(
      "Alex Example",
      "alex@example.test",
      "Example Engineering",
      "a-long-test-password",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/register$/),
      expect.objectContaining({
        body: JSON.stringify({
          name: "Alex Example",
          email: "alex@example.test",
          company: "Example Engineering",
          password: "a-long-test-password",
        }),
      }),
    );
  });

  it.each([
    ["Trainee Software Engineer", 1],
    ["Intern", 1],
    ["Junior Software Engineer", 2],
    ["Software Engineer", 3],
    ["Senior Software Engineer", 4],
    ["Engineering Manager", 4],
    ["Lead Software Engineer", 5],
    ["Lead Software Architect", 5],
    ["Senior Engineering Manager", 5],
    ["Engineering Director", 6],
    ["Technical Director", 6],
  ])("maps %s to JL%d", async (role, careerLevel) => {
    const rolePayload = {
      ...authPayload,
      user: { ...authPayload.user, role },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(rolePayload), { status: 200 }),
      ),
    );

    const session = await signIn("alex@example.test", "a-long-test-password");

    expect(session.careerLevel).toBe(careerLevel);
  });

  it("signs in without persisting the access token in browser storage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(authPayload), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await signIn("alex@example.test", "a-long-test-password");

    expect(session.userId).toBe("user-1");
    expect(getAccessToken()).toBe(authPayload.access_token);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: "include",
      method: "POST",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${window.location.protocol}//${window.location.hostname}:8001/auth/login`,
    );
    expect(localStorage.length).toBe(0);
  });

  it("restores a session using the HttpOnly refresh cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(authPayload), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await refreshSession();

    expect(session?.userId).toBe("user-1");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: "include",
      method: "POST",
    });
    expect(getAuthSession()?.accessToken).toBe(authPayload.access_token);
  });

  it("clears the in-memory session after logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(authPayload), { status: 200 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );
    await signIn("alex@example.test", "a-long-test-password");

    await signOut();

    expect(getAuthSession()).toBeNull();
  });
});
