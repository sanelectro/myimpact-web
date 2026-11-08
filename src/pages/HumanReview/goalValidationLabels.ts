const GOAL_VALIDATION_LABELS: Record<string, string> = {
  READY: "Ready",
  NEEDS_REFINEMENT: "Needs Refinement",
  NEEDS_DISCUSSION: "Needs Discussion",
  INVALID: "Invalid",
  NEEDS_IMPROVEMENT: "Needs Refinement",
  NEEDS_REVIEW: "Needs Discussion",
};

export function reviewLabel(value: string, context: Record<string, unknown> | null | undefined) {
  return context?.review_kind === "GOAL_VALIDATION"
    ? GOAL_VALIDATION_LABELS[value] ?? value
    : value;
}
