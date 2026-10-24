import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  decideEvidenceApproval,
  getPendingEvidenceApprovals,
} from "../../api/myImpact";
import type { PendingEvidenceApproval } from "../../types/api";
import "./PendingRequestsPage.css";

type Decision = "approved" | "rejected" | "needs_information";

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

export default function PendingRequestsPage() {
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: ["pending-evidence-approvals"],
    queryFn: getPendingEvidenceApprovals,
  });
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState("");
  const decisionMutation = useMutation({
    mutationFn: ({
      request,
      decision,
    }: {
      request: PendingEvidenceApproval;
      decision: Decision;
    }) =>
      decideEvidenceApproval(
        request.approval_id,
        decision,
        comments[request.approval_id] ?? "",
      ),
    onSuccess: async () => {
      setActionError("");
      await queryClient.invalidateQueries({
        queryKey: ["pending-evidence-approvals"],
      });
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : "Could not submit the review.",
      );
    },
  });

  function submitDecision(request: PendingEvidenceApproval, decision: Decision) {
    setActionError("");
    decisionMutation.mutate({ request, decision });
  }

  return (
    <div className="approval-page">
      <div className="page-heading">
        <div className="eyebrow">MANAGER WORKSPACE</div>
        <h1>Pending requests</h1>
        <p>Review evidence submitted by your direct reports and share a decision.</p>
      </div>

      {requestsQuery.isLoading && <p role="status">Loading pending requests…</p>}
      {requestsQuery.isError && (
        <div className="surface-card error-card" role="alert">
          Could not load pending requests: {requestsQuery.error.message}
        </div>
      )}
      {actionError && (
        <div className="surface-card error-card" role="alert">{actionError}</div>
      )}
      {requestsQuery.data?.length === 0 && (
        <div className="surface-card">
          <h2>All caught up</h2>
          <p>There are no pending evidence approvals from your direct reports.</p>
        </div>
      )}

      <div className="approval-request-list">
        {requestsQuery.data?.map((request) => (
          <details className="surface-card approval-request" key={request.approval_id}>
            <summary>
              <span className="approval-summary">
                <span className="status-pill">Pending</span>
                <strong>{request.evidence_title}</strong>
                <span>{request.employee_name} · {request.goal_title}</span>
              </span>
            </summary>

            <div className="approval-details">
              <div className="approval-context">
                <section>
                  <div className="eyebrow">GOAL</div>
                  <h2><Link to={`/goals/${request.goal_id}`}>{request.goal_title}</Link></h2>
                  <p>{request.goal_description || "No goal description provided."}</p>
                  <small>
                    {request.goal_status.replaceAll("_", " ")} · {dateLabel(request.goal_start_date)}
                    {" — "}{dateLabel(request.goal_end_date)}
                  </small>
                </section>

                <section>
                  <div className="eyebrow">MILESTONE</div>
                  <h3>{request.milestone_title || "No milestone linked"}</h3>
                  {request.milestone_description && <p>{request.milestone_description}</p>}
                  {request.milestone_completion_criteria && (
                    <p><strong>Completion criteria:</strong> {request.milestone_completion_criteria}</p>
                  )}
                  {request.milestone_status && (
                    <small>
                      {request.milestone_status.replaceAll("_", " ")}
                      {request.milestone_due_date
                        ? ` · Due ${dateLabel(request.milestone_due_date)}`
                        : ""}
                    </small>
                  )}
                </section>

                <section>
                  <div className="eyebrow">EVIDENCE</div>
                  <h3>{request.evidence_title}</h3>
                  <p>{request.evidence_description || "No evidence description provided."}</p>
                  <small>
                    {request.evidence_source_type} · captured {dateLabel(request.evidence_captured_at)}
                    {" · "}{request.relevance} relevance · {Math.round(request.confidence * 100)}% confidence
                  </small>
                  {request.reason && <p><strong>Relevance:</strong> {request.reason}</p>}
                  {request.evidence_source_url && (
                    <p>
                      <a href={request.evidence_source_url} target="_blank" rel="noreferrer">
                        Open source evidence
                      </a>
                    </p>
                  )}
                </section>
              </div>

              <label className="approval-comment">
                Comment for {request.employee_name} (optional)
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={comments[request.approval_id] ?? ""}
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [request.approval_id]: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="approval-actions">
                <button
                  type="button"
                  disabled={decisionMutation.isPending}
                  onClick={() => submitDecision(request, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={decisionMutation.isPending}
                  onClick={() => submitDecision(request, "rejected")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={decisionMutation.isPending}
                  onClick={() => submitDecision(request, "needs_information")}
                >
                  Need more information
                </button>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
