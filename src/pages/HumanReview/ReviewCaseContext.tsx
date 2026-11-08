import { useId, useState } from "react";

interface ReviewCaseContextProps {
  caseContext: Record<string, unknown>;
  heading: string;
  eyebrow: string;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && normalized !== "not specified" && normalized !== "not_specified";
  }
  if (Array.isArray(value)) return value.some(isPopulated);
  if (typeof value === "object") {
    return Object.values(value).some(isPopulated);
  }
  return true;
}

function contextValue(value: unknown): string {
  if (!isPopulated(value)) return "Not specified";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.filter(isPopulated).map(contextValue).join("; ");
  }
  return JSON.stringify(value);
}

const FIELD_EXAMPLES: Record<string, string> = {
  title: "Deliver a reporting feature",
  description: "Build a dashboard for support",
  goal_type: "Delivery",
  accountability: "Implement the feature",
  owner_role: "Software engineer",
  scope: "Team",
  success_criteria: "Feature accepted by support",
  deliverable: "Reporting dashboard",
  deliverables: "Reporting dashboard",
  outcome: "Faster reporting",
  expected_outcome: "Faster reporting",
  impact: "Reduced support effort",
  expected_impact: "Reduced support effort",
  measurement: "Usage analytics",
  measurement_method: "Usage analytics",
  baseline: "Current latency",
  target: "Agreed adoption rate",
  timeframe: "End of Q3",
  dependencies: "Security review",
  role_alignment: "Service ownership",
  role: "Software engineer",
  employee_role: "Software engineer",
  role_expectations: "Own assigned services",
  organizational_constraints: "Budget limits",
  organizational_context: "Team objective",
  source_references: "Goal document",
  additional_context: "Relevant scope",
  additional_information: "Relevant scope",
};

function fieldLabel(field: string) {
  return field.replaceAll("_", " ");
}

function FieldExample({ field }: { field: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={`goal-review-example${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="goal-review-example-trigger"
        aria-label={`Show example for ${fieldLabel(field)}`}
        aria-describedby={id}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
      >i</button>
      <span className="goal-review-example-tooltip" id={id} role="tooltip">
        Example: {FIELD_EXAMPLES[field] ?? "Relevant case details"}
      </span>
    </span>
  );
}

function GoalContextFields({ fields }: { fields: Record<string, unknown> }) {
  return (
    <dl className="human-review-context goal-review-context">
      {Object.entries(fields).map(([field, value]) => (
        <div
          key={field}
          className={field === "title" || field === "description" ? "goal-review-context-wide" : undefined}
        >
          <dt>
            {fieldLabel(field)}
            {" "}<FieldExample field={field} />
          </dt>
          <dd>{contextValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function GoalAttributes({ fields }: { fields: Record<string, unknown> }) {
  const entries = Object.entries(fields);
  const populated = Object.fromEntries(entries.filter(([, value]) => isPopulated(value)));
  const additional = Object.fromEntries(entries.filter(([, value]) => !isPopulated(value)));
  const additionalLabels = Object.keys(additional).map(fieldLabel).join(", ");

  return (
    <>
      {Object.keys(populated).length > 0
        ? <GoalContextFields fields={populated} />
        : <p>No goal attributes are populated for this case.</p>}
      <p className="goal-review-context-hint">
        Only populated fields are shown. Expand to see the remaining goal attributes.
      </p>
      {Object.keys(additional).length > 0 && (
        <details className="goal-review-context-details">
          <summary>
            <span>View all goal attributes</span>
            <small>{additionalLabels}</small>
          </summary>
          <GoalContextFields fields={additional} />
        </details>
      )}
    </>
  );
}

export default function ReviewCaseContext({
  caseContext,
  heading,
  eyebrow,
}: ReviewCaseContextProps) {
  const goal = caseContext.goal as Record<string, unknown> | undefined;
  const criterion = caseContext.criterion as Record<string, unknown> | undefined;
  const definition = criterion?.definition as Record<string, unknown> | undefined;
  const evidence = Array.isArray(caseContext.evidence) ? caseContext.evidence : [];
  const isGoalValidation = caseContext.review_kind === "GOAL_VALIDATION";
  const roleContext = caseContext.goal_validation_context;
  const populatedRoleContext = roleContext && typeof roleContext === "object" && !Array.isArray(roleContext)
    ? Object.fromEntries(
      Object.entries(roleContext).filter(([, value]) => isPopulated(value)),
    )
    : {};
  if (isGoalValidation) {
    return (
      <>
        <div className="card-eyebrow">{eyebrow}</div>
        <h2>{heading}</h2>
        <p>{textValue(caseContext.scenario)}</p>
        <p>
          {caseContext.reference_visibility === "PROPOSAL_ASSISTED"
            ? "AI proposals are shown for proposal-assisted review, not blind review."
            : "Independent blind review: provisional reference labels are not shown."}
        </p>
        <section aria-label="Goal context">
          <h3>Goal context</h3>
          <GoalAttributes fields={goal ?? {}} />
        </section>
        <section aria-label="Role and scenario context">
          <h3>Role and scenario context</h3>
          {Object.keys(populatedRoleContext).length > 0
            ? <GoalContextFields fields={populatedRoleContext} />
            : <p>No additional role or organizational context provided for this case.</p>}
        </section>
      </>
    );
  }

  return (
    <>
      <div className="card-eyebrow">{eyebrow}</div>
      <h2>{heading}</h2>
      <p>{textValue(caseContext.scenario)}</p>
      <dl className="human-review-context">
        <div>
          <dt>Goal</dt>
          <dd>
            <strong>{textValue(goal?.title)}</strong>
            {textValue(goal?.description) && <p>{textValue(goal?.description)}</p>}
          </dd>
        </div>
        <div>
          <dt>Criterion</dt>
          <dd>{textValue(definition?.description)}</dd>
        </div>
        <div>
          <dt>Completion condition</dt>
          <dd>{textValue(definition?.completion_conditions)}</dd>
        </div>
      </dl>
      <section className="human-review-evidence" aria-labelledby={`${heading}-evidence`}>
        <h3 id={`${heading}-evidence`}>Evidence provided for this case</h3>
        {evidence.length === 0 ? (
          <p>No evidence was provided. Consider whether that is enough to support the criterion.</p>
        ) : (
          <div className="human-review-evidence-list">
            {evidence.map((item, index) => {
              const evidenceItem = item as Record<string, unknown>;
              return (
                <article className="human-review-evidence-item" key={textValue(evidenceItem.mapping_id) || index}>
                  <h4>{textValue(evidenceItem.title) || `Evidence ${index + 1}`}</h4>
                  <p>{textValue(evidenceItem.content)}</p>
                  <dl>
                    <div>
                      <dt>Source type</dt>
                      <dd>{textValue(evidenceItem.source_type) || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Captured</dt>
                      <dd>{textValue(evidenceItem.captured_at) || "Not specified"}</dd>
                    </div>
                    {textValue(evidenceItem.source_url) && (
                      <div>
                        <dt>Source</dt>
                        <dd>{textValue(evidenceItem.source_url)}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
