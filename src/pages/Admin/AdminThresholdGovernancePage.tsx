import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createThresholdSet,
  decideThresholdSet,
  getThresholdMetricDefinitions,
  getThresholdSets,
  proposeThresholdSet,
} from "../../api/myImpact";
import type { ThresholdMetricDefinition } from "../../types/api";
import "./AdminReliabilityPage.css";

const DATASET_VERSION = "m66-criterion-assessment-v1";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function defaultOperator(metric: ThresholdMetricDefinition) {
  return metric.direction === "LOWER_IS_BETTER" ? "<=" : ">=";
}

export default function AdminThresholdGovernancePage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("M6.6 release thresholds");
  const [promptVersion, setPromptVersion] = useState(DATASET_VERSION);
  const [modelIdentifier, setModelIdentifier] = useState("");
  const [evaluationCodeVersion, setEvaluationCodeVersion] = useState("");
  const [proposalRationale, setProposalRationale] = useState("");
  const [thresholdValues, setThresholdValues] = useState<Record<string, string>>({});
  const [itemRationales, setItemRationales] = useState<Record<string, string>>({});
  const [decisionRationale, setDecisionRationale] = useState("");

  const definitionsQuery = useQuery({
    queryKey: ["admin", "thresholds", "definitions"],
    queryFn: getThresholdMetricDefinitions,
  });
  const setsQuery = useQuery({
    queryKey: ["admin", "thresholds", "sets"],
    queryFn: getThresholdSets,
  });
  const selected = setsQuery.data?.find((item) => item.id === selectedId) ?? null;
  const metrics = definitionsQuery.data ?? [];
  const items = useMemo(
    () =>
      metrics.map((metric) => ({
        metric_id: metric.metric_id,
        metric_definition_version: metric.definition_version,
        operator: defaultOperator(metric),
        threshold_value: Number(thresholdValues[metric.metric_id]),
        unit: metric.unit,
        rationale: itemRationales[metric.metric_id] ?? "",
        required: true,
      })),
    [itemRationales, metrics, thresholdValues],
  );
  const canCreate = Boolean(
    name.trim() &&
      proposalRationale.trim() &&
      promptVersion.trim() &&
      modelIdentifier.trim() &&
      evaluationCodeVersion.trim() &&
      metrics.length > 0 &&
      items.every(
        (item) =>
          Number.isFinite(item.threshold_value) &&
          item.rationale.trim().length > 0,
      ),
  );
  const createMutation = useMutation({
    mutationFn: () =>
      createThresholdSet({
        name,
        dataset_id: DATASET_VERSION,
        dataset_version: DATASET_VERSION,
        prompt_version: promptVersion,
        model_identifier: modelIdentifier,
        model_configuration: {},
        evaluation_code_version: evaluationCodeVersion,
        proposal_rationale: proposalRationale,
        items,
      }),
    onSuccess: (thresholdSet) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "thresholds"] });
      setSelectedId(thresholdSet.id);
    },
  });
  const proposeMutation = useMutation({
    mutationFn: () => proposeThresholdSet(selectedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "thresholds"] });
    },
  });
  const decisionMutation = useMutation({
    mutationFn: (decision: "APPROVED" | "REJECTED") =>
      decideThresholdSet(selectedId!, {
        decision,
        rationale: decisionRationale,
        policy_reference: "M6.6.3 platform-admin approval policy",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "thresholds"] });
      setDecisionRationale("");
    },
  });

  if (definitionsQuery.isLoading || setsQuery.isLoading) {
    return <p role="status">Loading metric governance…</p>;
  }
  if (definitionsQuery.isError || setsQuery.isError) {
    return (
      <p role="alert">
        Could not load metric governance:{" "}
        {errorMessage(definitionsQuery.error ?? setsQuery.error)}
      </p>
    );
  }

  return (
    <div className="admin-reliability-page">
      <header className="admin-reliability-hero">
        <div>
          <div className="eyebrow">M6.6.3 METRIC GOVERNANCE</div>
          <h1>Metric thresholds</h1>
          <p>
            Metric definitions and threshold decisions are versioned, explicit,
            and separate from evaluation results. No threshold is approved by
            this screen automatically.
          </p>
        </div>
      </header>

      <div className="admin-reliability-layout">
        <section className="surface-card admin-reliability-config">
          <div className="card-eyebrow">PROPOSE A SET</div>
          <h2>Record owner-approved values</h2>
          <p className="admin-reliability-note">
            Do not use exploratory values as release thresholds. Dataset,
            prompt, model, and evaluation-code versions must be confirmed by
            the project owner before proposing.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label>
              Threshold-set name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Prompt version
              <input value={promptVersion} onChange={(event) => setPromptVersion(event.target.value)} />
            </label>
            <label>
              Model identifier
              <input value={modelIdentifier} onChange={(event) => setModelIdentifier(event.target.value)} />
            </label>
            <label>
              Evaluation code version
              <input value={evaluationCodeVersion} onChange={(event) => setEvaluationCodeVersion(event.target.value)} />
            </label>
            <label>
              Proposal rationale
              <textarea
                rows={3}
                value={proposalRationale}
                onChange={(event) => setProposalRationale(event.target.value)}
              />
            </label>
            {metrics.map((metric) => (
              <label key={metric.metric_id}>
                {metric.name} ({metric.direction})
                <input
                  type="number"
                  min={0}
                  max={1}
                  step="0.0001"
                  placeholder="Owner-approved value"
                  value={thresholdValues[metric.metric_id] ?? ""}
                  onChange={(event) =>
                    setThresholdValues((current) => ({
                      ...current,
                      [metric.metric_id]: event.target.value,
                    }))
                  }
                />
                <small>{metric.description}</small>
                <textarea
                  rows={2}
                  placeholder="Rationale for this metric threshold"
                  value={itemRationales[metric.metric_id] ?? ""}
                  onChange={(event) =>
                    setItemRationales((current) => ({
                      ...current,
                      [metric.metric_id]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            {createMutation.isError && (
              <p className="reliability-error" role="alert">
                {errorMessage(createMutation.error)}
              </p>
            )}
            <button className="primary-link" type="submit" disabled={!canCreate || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create draft threshold set"}
            </button>
          </form>
        </section>

        <section className="surface-card admin-reliability-list">
          <div className="card-eyebrow">VERSIONED SETS</div>
          <h2>Proposal history</h2>
          {!setsQuery.data?.length && <p>No threshold sets have been created.</p>}
          {(setsQuery.data ?? []).map((thresholdSet) => (
            <button
              className={thresholdSet.id === selectedId ? "reliability-experiment selected" : "reliability-experiment"}
              key={thresholdSet.id}
              type="button"
              onClick={() => setSelectedId(thresholdSet.id)}
            >
              <span>{thresholdSet.name}</span>
              <small>v{thresholdSet.version} · {thresholdSet.status}</small>
            </button>
          ))}
        </section>
      </div>

      {selected && (
        <section className="surface-card admin-reliability-detail">
          <div className="section-heading">
            <div>
              <div className="card-eyebrow">THRESHOLD SET DETAIL</div>
              <h2>{selected.name}</h2>
            </div>
            <span className="reliability-badge">{selected.status}</span>
          </div>
          <p className="admin-reliability-note">{selected.proposal_rationale}</p>
          {selected.status === "DRAFT" && (
            <div className="reliability-actions">
              <button type="button" onClick={() => proposeMutation.mutate()} disabled={proposeMutation.isPending}>
                {proposeMutation.isPending ? "Proposing…" : "Submit for approval"}
              </button>
            </div>
          )}
          {selected.status === "PROPOSED" && (
            <>
              <label>
                Decision rationale
                <textarea
                  rows={3}
                  value={decisionRationale}
                  onChange={(event) => setDecisionRationale(event.target.value)}
                />
              </label>
              <div className="reliability-actions">
                <button
                  type="button"
                  onClick={() => decisionMutation.mutate("REJECTED")}
                  disabled={!decisionRationale.trim() || decisionMutation.isPending}
                >
                  Reject
                </button>
                <button
                  className="primary-link"
                  type="button"
                  onClick={() => decisionMutation.mutate("APPROVED")}
                  disabled={!decisionRationale.trim() || decisionMutation.isPending}
                >
                  Approve
                </button>
              </div>
            </>
          )}
          {proposeMutation.isError && <p className="reliability-error" role="alert">{errorMessage(proposeMutation.error)}</p>}
          {decisionMutation.isError && <p className="reliability-error" role="alert">{errorMessage(decisionMutation.error)}</p>}
          {selected.approvals.map((approval) => (
            <p key={`${approval.approver_user_id}-${approval.decided_at}`} role="status">
              {approval.decision} by {approval.approver_user_id}: {approval.rationale}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
