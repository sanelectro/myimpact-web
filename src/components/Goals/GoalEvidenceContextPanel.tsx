import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalEvidence, getGoalEvidenceContext, getGoals, linkGoalEvidence } from "../../api/myImpact";
import type { GoalEvidenceEligibility } from "../../types/api";
import EvidenceEligibilityGate from "./EvidenceEligibilityGate";
import "./GoalHierarchyPanel.css";

export default function GoalEvidenceContextPanel({ goalId, eligibility, eligibilityLoading, eligibilityError }: {
  goalId: string;
  eligibility?: GoalEvidenceEligibility;
  eligibilityLoading: boolean;
  eligibilityError: boolean;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [sourceGoal, setSourceGoal] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [kind, setKind] = useState<"PRIMARY" | "CONTRIBUTION">("PRIMARY");
  const [description, setDescription] = useState("");
  const [relevance, setRelevance] = useState<"low" | "medium" | "high">("medium");
  const context = useQuery({
    queryKey: ["goal-evidence-context", goalId, offset],
    queryFn: () => getGoalEvidenceContext(goalId, offset),
    enabled: open,
  });
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals, enabled: open && !!eligibility?.eligible });
  const sourceEvidence = useQuery({
    queryKey: ["goal-evidence", sourceGoal],
    queryFn: () => getGoalEvidence(sourceGoal),
    enabled: open && !!sourceGoal && !!eligibility?.eligible,
  });
  const link = useMutation({
    mutationFn: () => linkGoalEvidence(goalId, {
      evidence_id: evidenceId,
      mapping_kind: kind,
      contribution_description: kind === "CONTRIBUTION" ? description.trim() || null : null,
      relevance,
    }),
    onSuccess: async () => {
      setEvidenceId("");
      setDescription("");
      void client.invalidateQueries({ queryKey: ["goal-measures"] });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["goal-evidence"] }),
        client.invalidateQueries({ queryKey: ["goal-evidence-context"] }),
        client.invalidateQueries({ queryKey: ["goal-assessment", goalId] }),
        client.invalidateQueries({ queryKey: ["pending-evidence-approvals"] }),
      ]);
    },
  });

  return (
    <section className="goal-detail-card goal-hierarchy-panel">
      <div className="card-eyebrow">HIERARCHY EVIDENCE</div>
      <h2>Evidence context</h2>
      <p>Inherited evidence remains linked to its source goal; it does not automatically satisfy this goal.</p>
      <button className="goal-edit-button" type="button" onClick={() => setOpen(!open)}>
        {open ? "Hide evidence context" : "Show evidence context"}
      </button>
      {open && <>
        {context.isLoading ? <p role="status">Loading evidence context…</p> : context.isError ? (
          <p className="form-error" role="alert">Could not load evidence context: {context.error.message}</p>
        ) : context.data && <>
          {context.data.hierarchy_truncated && <p role="status">Hierarchy traversal was limited; this evidence list may be incomplete.</p>}
          {context.data.items.length ? <ul>
            {context.data.items.map((item) => <li key={item.evidence_id}>
              <strong>{item.title}</strong>
              <ul>{item.origins.map((origin) => <li key={origin.mapping_id}>
                {origin.origin === "DIRECT" ? "Direct" : "Inherited"} · {origin.mapping_kind.toLowerCase()} ·{" "}
                source goal: <Link to={`/goals/${encodeURIComponent(origin.source_goal_id)}`}>{origin.source_goal_id}</Link>
                {" · "}path: {origin.goal_path.join(" → ")} · approval: {origin.approval_status ?? "not available"}
                {origin.contribution_description && ` · ${origin.contribution_description}`}
              </li>)}</ul>
            </li>)}
          </ul> : <p>No evidence on this page.</p>}
          <div className="goal-hierarchy-actions">
            <button type="button" className="goal-edit-button" disabled={offset === 0 || context.isFetching} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous evidence</button>
            <button type="button" className="goal-edit-button" disabled={!context.data.has_more || context.isFetching} onClick={() => setOffset(context.data!.next_offset!)}>Next evidence</button>
          </div>
        </>}
        <h3>Link existing evidence</h3>
        <EvidenceEligibilityGate eligibility={eligibility} isLoading={eligibilityLoading} isError={eligibilityError}>
          <p>Choose evidence already linked to one of your other goals. The new link requires approval.</p>
          {goals.isError ? <p role="alert" className="form-error">Could not load goals: {goals.error.message}</p> : <label>
            Source goal
            <select value={sourceGoal} disabled={goals.isLoading || link.isPending} onChange={(event) => {
              setSourceGoal(event.target.value);
              setEvidenceId("");
              link.reset();
            }}>
              <option value="">Select a goal</option>
              {(goals.data ?? []).filter((goal) => goal.id !== goalId).map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}
            </select>
          </label>}
          {sourceGoal && (sourceEvidence.isLoading ? <p role="status">Loading evidence…</p> : sourceEvidence.isError ? (
            <p className="form-error" role="alert">Could not load source evidence: {sourceEvidence.error.message}</p>
          ) : <label>
            Evidence
            <select value={evidenceId} disabled={link.isPending} onChange={(event) => {
              setEvidenceId(event.target.value);
              link.reset();
            }}>
              <option value="">Select evidence</option>
              {(sourceEvidence.data ?? []).map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.title}</option>)}
            </select>
          </label>)}
          <label>Relationship type
            <select value={kind} disabled={link.isPending} onChange={(event) => setKind(event.target.value as "PRIMARY" | "CONTRIBUTION")}>
              <option value="PRIMARY">Primary</option><option value="CONTRIBUTION">Contribution</option>
            </select>
          </label>
          {kind === "CONTRIBUTION" && <label>Contribution description <small>(optional)</small>
            <input maxLength={4000} value={description} disabled={link.isPending} onChange={(event) => setDescription(event.target.value)} />
          </label>}
          <label>Relevance
            <select value={relevance} disabled={link.isPending} onChange={(event) => setRelevance(event.target.value as "low" | "medium" | "high")}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <button type="button" className="goal-edit-button" disabled={!evidenceId || link.isPending} onClick={() => link.mutate()}>
            {link.isPending ? "Linking…" : "Link evidence"}
          </button>
          {link.isError && <p role="alert" className="form-error">Could not link evidence: {link.error.message}</p>}
          {link.isSuccess && <p role="status">Evidence linked. Approval is pending.</p>}
        </EvidenceEligibilityGate>
      </>}
    </section>
  );
}
