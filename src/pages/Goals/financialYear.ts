import type { Goal } from "../../types/api";

export type GoalYear = number | "undated";

export function getCurrentGoalYear(today = new Date()) {
  return today.getFullYear();
}

export function getGoalYear(goal: Goal): number | null {
  const date = goal.start_date ?? goal.end_date;
  if (!date) return null;

  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export function getAvailableGoalYears(goals: Goal[], currentYear: number) {
  const years = new Set(goals.map(getGoalYear).filter((year): year is number => year !== null));
  years.add(currentYear);
  return [...years].sort((a, b) => b - a);
}

export function isGoalInYear(goal: Goal, year: GoalYear) {
  const goalYear = getGoalYear(goal);
  return year === "undated" ? goalYear === null : goalYear === year;
}
