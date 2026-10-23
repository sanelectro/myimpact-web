// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  authenticateMockUser,
  clearMockSession,
  getCurrentUserId,
  getMockSession,
} from "../src/auth/mockAuth";

describe("mock login", () => {
  beforeEach(() => localStorage.clear());

  it.each([
    ["alex", "alex123", "user-1", "Lead Software Engineer"],
    ["priya", "priya123", "user-2", "Software Engineer"],
    ["empty", "empty123", "user-empty", "Software Engineer"],
    ["user-3", "jl4-demo", "user-3", "JL-4"],
  ])("maps %s to the matching demo user", (username, password, userId, role) => {
    const session = authenticateMockUser(username, password);

    expect(session).toMatchObject({ userId, role });
    expect(getCurrentUserId()).toBe(userId);
  });

  it("rejects invalid credentials without creating a session", () => {
    expect(authenticateMockUser("user-3", "wrong-password")).toBeNull();
    expect(getMockSession()).toBeNull();
  });

  it("clears the session on logout", () => {
    authenticateMockUser("user-3", "jl4-demo");
    clearMockSession();

    expect(getMockSession()).toBeNull();
  });

  it("assigns the JL-4 career level to user-3", () => {
    expect(authenticateMockUser("user-3", "jl4-demo")?.careerLevel).toBe(4);
  });
});