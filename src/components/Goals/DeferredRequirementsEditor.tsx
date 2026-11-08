import type { GoalDeferredRequirement } from "../../types/api";

type Requirement = GoalDeferredRequirement["requirement"];

export function validateDeferrals(items: GoalDeferredRequirement[], baseline: string, target: string): string | null {
  for (const item of items) {
    if (!item.reason.trim()) return `Enter a reason for the ${item.requirement} deferral.`;
    if (item.state === "OPEN" && !item.due_date && !item.resolution_stage?.trim()) {
      return `Enter a due date or resolution stage for the ${item.requirement} deferral.`;
    }
    if (item.state !== "OPEN" && !item.resolution_reason?.trim()) {
      return `Enter a resolution reason for the ${item.requirement} deferral.`;
    }
    if (item.state === "RESOLVED" && !(item.requirement === "baseline" ? baseline : target).trim()) {
      return `Enter a ${item.requirement} value before resolving its deferral.`;
    }
  }
  return null;
}

export default function DeferredRequirementsEditor({ items, original, onChange }: {
  items: GoalDeferredRequirement[];
  original: GoalDeferredRequirement[];
  onChange: (items: GoalDeferredRequirement[]) => void;
}) {
  function update(requirement: Requirement, change: Partial<GoalDeferredRequirement>) {
    onChange(items.map((item) => item.requirement === requirement ? { ...item, ...change } : item));
  }
  function selectState(requirement: Requirement, state: GoalDeferredRequirement["state"] | "") {
    const item = items.find((entry) => entry.requirement === requirement);
    if (!state) {
      onChange(items.filter((entry) => entry.requirement !== requirement));
    } else if (item) {
      update(requirement, { state, resolution_reason: state === "OPEN" ? null : item.resolution_reason });
    } else {
      onChange([...items, {
        requirement, state, reason: "", due_date: null, resolution_stage: null,
        resolution_reason: null, related_child_goal_id: null,
      }]);
    }
  }
  return <div className="form-section">
    <div className="eyebrow">PROGRESSIVE REQUIREMENTS</div>
    <h2>Defer baseline or target</h2>
    <p className="field-help">Accountability and success criteria remain required. An open deferral needs a reason and a due date or resolution stage.</p>
    {(["baseline", "target"] as const).map((requirement) => {
      const item = items.find((entry) => entry.requirement === requirement);
      const persisted = original.some((entry) => entry.requirement === requirement);
      const title = requirement === "baseline" ? "Baseline" : "Target";
      return <fieldset key={requirement} className="goal-deferral-fields">
        <legend>{title} deferral</legend>
        <label className="form-field">{title} deferral state
          <select value={item?.state ?? ""} onChange={(event) => selectState(requirement, event.target.value as GoalDeferredRequirement["state"] | "")}>
            {!persisted && <option value="">Not deferred</option>}
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="NOT_APPLICABLE">Not applicable</option>
          </select>
        </label>
        {item && <>
          <label className="form-field">{title} deferral reason
            <input maxLength={1000} value={item.reason} onChange={(event) => update(requirement, { reason: event.target.value })} />
          </label>
          <label className="form-field">{title} due date
            <input type="date" value={item.due_date ?? ""} onChange={(event) => update(requirement, { due_date: event.target.value || null })} />
          </label>
          <label className="form-field">{title} resolution stage
            <input maxLength={200} value={item.resolution_stage ?? ""} onChange={(event) => update(requirement, { resolution_stage: event.target.value || null })} />
          </label>
          {item.state !== "OPEN" && <label className="form-field">{title} resolution reason
            <input maxLength={1000} value={item.resolution_reason ?? ""} onChange={(event) => update(requirement, { resolution_reason: event.target.value || null })} />
          </label>}
          {item.related_child_goal_id && <p className="field-help">Related child goal: {item.related_child_goal_id}</p>}
        </>}
      </fieldset>;
    })}
  </div>;
}
