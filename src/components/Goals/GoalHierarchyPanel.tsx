import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  changeGoalParent,
  getGoalChildren,
  getGoalHierarchy,
  getGoalRelationshipHistory,
  getGoals,
} from "../../api/myImpact";
import "./GoalHierarchyPanel.css";

const PAGE_SIZE = 50;

export default function GoalHierarchyPanel({ goalId }: { goalId: string }) {
  const queryClient = useQueryClient();
  const [parentId, setParentId] = useState("");
  const [reason, setReason] = useState("");
  const [childOffset, setChildOffset] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const hierarchy = useQuery({ queryKey: ["goal-hierarchy", goalId], queryFn: () => getGoalHierarchy(goalId) });
  const children = useQuery({
    queryKey: ["goal-children", goalId, childOffset],
    queryFn: () => getGoalChildren(goalId, childOffset, PAGE_SIZE),
  });
  const history = useQuery({
    queryKey: ["goal-relationship-history", goalId, historyOffset],
    queryFn: () => getGoalRelationshipHistory(goalId, historyOffset, PAGE_SIZE),
  });
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const change = useMutation({
    mutationFn: (nextParent: string | null) =>
      changeGoalParent(goalId, nextParent, hierarchy.data!.goal.relationship_revision, reason.trim() || null),
    onSuccess: () => {
      setParentId("");
      setReason("");
      setChildOffset(0);
      setHistoryOffset(0);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goal-hierarchy"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-children"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-relationship-history"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-evidence-context"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-measures"] }),
      ]);
    },
  });
  const currentParent = hierarchy.data?.goal.parent_goal_id;

  return (
    <section className="goal-detail-card goal-hierarchy-panel">
      <div className="card-eyebrow">GOAL HIERARCHY</div>
      <h2>Alignment and relationships</h2>
      <p>Relationships show alignment; they do not change goal level, approval, or evidence ownership.</p>
      {hierarchy.isLoading ? <p role="status">Loading hierarchy…</p> : hierarchy.isError ? (
        <p className="form-error" role="alert">Could not load hierarchy: {hierarchy.error.message}</p>
      ) : hierarchy.data && (
        <>
          <h3>Ancestors</h3>
          {hierarchy.data.ancestors.length ? (
            <ol>
              {hierarchy.data.ancestors.map((ancestor) => (
                <li key={ancestor.id}><Link to={`/goals/${encodeURIComponent(ancestor.id)}`}>{ancestor.title}</Link>
                  {ancestor.goal_level && ` · ${ancestor.goal_level.toLowerCase()}`}</li>
              ))}
            </ol>
          ) : <p>No parent goal.</p>}
          {hierarchy.data.next_ancestor_id && (
            <p>More ancestors: <Link to={`/goals/${encodeURIComponent(hierarchy.data.next_ancestor_id)}`}>continue from the next ancestor</Link>.</p>
          )}
          {goals.isError ? <p className="form-error" role="alert">Could not load parent choices: {goals.error.message}</p> : (
            <label>
              Parent goal
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={goals.isLoading || change.isPending}>
                <option value="">Select a goal</option>
                {(goals.data ?? []).filter((goal) => goal.id !== goalId && goal.id !== currentParent).map((goal) => (
                  <option value={goal.id} key={goal.id}>{goal.title}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Reason <small>(optional)</small>
            <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} disabled={change.isPending} />
          </label>
          <div className="goal-hierarchy-actions">
            <button type="button" className="goal-edit-button" disabled={!parentId || change.isPending || hierarchy.isFetching}
              onClick={() => change.mutate(parentId)}>
              {currentParent ? "Change parent" : "Connect parent"}
            </button>
            {currentParent && <button type="button" className="goal-edit-button" disabled={change.isPending || hierarchy.isFetching}
              onClick={() => change.mutate(null)}>Disconnect parent</button>}
          </div>
          {change.isError && <p className="form-error" role="alert">Could not change parent: {change.error.message}</p>}
        </>
      )}
      <h3>Direct children</h3>
      {children.isLoading ? <p role="status">Loading children…</p> : children.isError ? (
        <p className="form-error" role="alert">Could not load children: {children.error.message}</p>
      ) : children.data?.length ? (
        <ul>{children.data.map((child) => <li key={child.id}><Link to={`/goals/${encodeURIComponent(child.id)}`}>{child.title}</Link> · {child.status}</li>)}</ul>
      ) : <p>No children on this page.</p>}
      <div className="goal-hierarchy-actions">
        <button type="button" className="goal-edit-button" disabled={childOffset === 0 || children.isFetching} onClick={() => setChildOffset(childOffset - PAGE_SIZE)}>Previous children</button>
        <button type="button" className="goal-edit-button" disabled={children.isFetching || (children.data?.length ?? 0) < PAGE_SIZE} onClick={() => setChildOffset(childOffset + PAGE_SIZE)}>Next children</button>
      </div>
      <details>
        <summary>Relationship history</summary>
        {history.isLoading ? <p role="status">Loading relationship history…</p> : history.isError ? (
          <p className="form-error" role="alert">Could not load relationship history: {history.error.message}</p>
        ) : history.data?.length ? (
          <ol className="goal-history-list">{history.data.map((event) => (
            <li key={event.id}>
              <strong>Revision {event.relationship_revision}</strong>{" · "}
              <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
              <p>From: {event.old_parent_goal_id ?? "No parent"} · To: {event.new_parent_goal_id ?? "No parent"}</p>
              <p>Changed by: {event.actor_user_id}{event.reason && ` · ${event.reason}`}</p>
            </li>
          ))}</ol>
        ) : <p>No relationship changes on this page.</p>}
        <div className="goal-hierarchy-actions">
          <button type="button" className="goal-edit-button" disabled={historyOffset === 0 || history.isFetching} onClick={() => setHistoryOffset(historyOffset - PAGE_SIZE)}>Previous history</button>
          <button type="button" className="goal-edit-button" disabled={history.isFetching || (history.data?.length ?? 0) < PAGE_SIZE} onClick={() => setHistoryOffset(historyOffset + PAGE_SIZE)}>Next history</button>
        </div>
      </details>
    </section>
  );
}
