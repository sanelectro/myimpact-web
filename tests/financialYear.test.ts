import { describe, expect, it } from "vitest";
import type { Goal } from "../src/types/api";
import { getAvailableGoalYears, getCurrentGoalYear, getGoalYear, isGoalInYear } from "../src/pages/Goals/financialYear";

function goal(dates: Pick<Goal, "start_date" | "end_date">): Goal {
  return {
    id: "goal-1",
    title: "A goal",
    description: null,
    scope: "personal",
    start_date: dates.start_date,
    end_date: dates.end_date,
    status: "active",
    sub_status: "not_started",
    deactivation_reason: null,
    source: null,
    source_document_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("goal financial-year selection", () => {
  it("uses the start year, falling back to the target year when needed", () => {
    expect(getGoalYear(goal({ start_date: "2025-11-10", end_date: "2026-04-01" }))).toBe(2025);
    expect(getGoalYear(goal({ start_date: null, end_date: "2024-08-15" }))).toBe(2024);
    expect(getGoalYear(goal({ start_date: null, end_date: null }))).toBeNull();
  });

  it("lists the current and available goal years in descending order", () => {
    const goals = [
      goal({ start_date: "2024-01-01", end_date: null }),
      goal({ start_date: "2026-01-01", end_date: null }),
      goal({ start_date: "2024-12-31", end_date: null }),
    ];

    expect(getAvailableGoalYears(goals, 2025)).toEqual([2026, 2025, 2024]);
  });

  it("matches goals to a selected year and keeps undated goals accessible", () => {
    const datedGoal = goal({ start_date: "2025-01-01", end_date: "2025-12-31" });
    const undatedGoal = goal({ start_date: null, end_date: null });

    expect(isGoalInYear(datedGoal, 2025)).toBe(true);
    expect(isGoalInYear(datedGoal, 2024)).toBe(false);
    expect(isGoalInYear(undatedGoal, "undated")).toBe(true);
  });

  it("uses the current calendar year", () => {
    expect(getCurrentGoalYear(new Date(2026, 9, 22))).toBe(2026);
  });
});
