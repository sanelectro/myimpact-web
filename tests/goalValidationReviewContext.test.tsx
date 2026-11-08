import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReviewCaseContext from "../src/pages/HumanReview/ReviewCaseContext";

describe("Goal Validation human-review context", () => {
  it("renders goal structure without suggesting evidence is required", () => {
    const html = renderToStaticMarkup(
      <ReviewCaseContext
        heading="gv-01"
        eyebrow="CASE CONTEXT"
        caseContext={{
          review_kind: "GOAL_VALIDATION",
          goal: {
            title: "Deliver reporting",
            goal_type: "NOT_SPECIFIED",
            accountability: "Implement the feature",
            success_criteria: ["Feature acceptance by the support team"],
            target: null,
          },
          goal_validation_context: { role: "Engineer", role_expectations: null },
        }}
      />
    );
    expect(html).toContain("Deliver reporting");
    expect(html).toContain("Implement the feature");
    expect(html).toContain("Feature acceptance by the support team");
    expect(html).toContain("Independent blind review");
    expect(html).toContain("Engineer");
    expect(html).toContain("<summary><span>View all goal attributes</span>");
    expect(html).toContain("<dd>Not specified</dd>");
    expect(html).toContain("goal-review-context");
    expect(html).toContain("Show example for goal type");
    expect(html).toContain("Example: Delivery");
    expect(html).toContain("Example: Implement the feature");
    expect(html).not.toContain("NOT_SPECIFIED");
    expect(html).not.toContain("No evidence was provided");
    expect(html).not.toContain("Completion condition");
  });

  it("preserves the existing evidence-assessment context", () => {
    const html = renderToStaticMarkup(
      <ReviewCaseContext
        heading="evidence-case"
        eyebrow="CASE CONTEXT"
        caseContext={{
          goal: { title: "Improve releases" },
          criterion: { definition: { description: "Enable canaries", completion_conditions: "Canaries enabled" } },
          evidence: [{ mapping_id: "mapping-1", title: "Release proof", content: "Canaries enabled in production" }],
        }}
      />
    );
    expect(html).toContain("Completion condition");
    expect(html).toContain("Release proof");
    expect(html).not.toContain("Independent blind review");
    expect(html).not.toContain("goal-review-context");
  });

  it("provides specific examples for every field in both Goal Validation datasets", () => {
    const goalFields = [
      "title", "description", "goal_type", "accountability", "owner_role", "scope",
      "success_criteria", "deliverable", "deliverables", "outcome", "expected_outcome",
      "impact", "expected_impact", "baseline", "target", "measurement",
      "measurement_method", "timeframe", "dependencies", "role_alignment",
    ];
    const contextFields = [
      "role", "employee_role", "role_expectations", "organizational_constraints",
      "organizational_context", "source_references", "additional_context", "additional_information",
    ];
    const html = renderToStaticMarkup(
      <ReviewCaseContext
        heading="gv-02"
        eyebrow="CASE CONTEXT"
        caseContext={{
          review_kind: "GOAL_VALIDATION",
          goal: Object.fromEntries(goalFields.map((field) => [field, null])),
          goal_validation_context: Object.fromEntries(contextFields.map((field) => [field, null])),
        }}
      />
    );
    expect(html.match(/role="tooltip"/g)).toHaveLength(goalFields.length);
    expect(html.match(/Example:/g)).toHaveLength(goalFields.length);
    expect(html.split("<details")[0]).not.toContain("Not specified");
    expect(html).toContain("No additional role or organizational context provided for this case.");
  });

  it("keeps populated fields visible and moves only empty attributes into the disclosure", () => {
    const html = renderToStaticMarkup(
      <ReviewCaseContext
        heading="gv-03"
        eyebrow="CASE CONTEXT"
        caseContext={{
          review_kind: "GOAL_VALIDATION",
          goal: {
            title: "Improve release reliability",
            goal_type: "Outcome",
            scope: null,
            success_criteria: [],
            target: "Reduce failed deployments",
          },
          goal_validation_context: {
            employee_role: "Platform engineer",
            role_expectations: "Own deployment tooling",
            organizational_context: "",
          },
        }}
      />
    );
    const visibleGoalFields = html.split("<details")[0];
    expect(visibleGoalFields).toContain("Improve release reliability");
    expect(visibleGoalFields).toContain("Outcome");
    expect(visibleGoalFields).toContain("Reduce failed deployments");
    expect(visibleGoalFields).not.toContain("scope");
    expect(visibleGoalFields).not.toContain("success criteria");
    expect(html).toContain("scope, success criteria");
    expect(html).toContain("employee role");
    expect(html).toContain("Platform engineer");
    expect(html).not.toContain("Show example for organizational context");
  });
});
