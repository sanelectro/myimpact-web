import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createReliabilityExperiment,
  getReliabilityAttempts,
  getReliabilityComparisons,
  getReliabilityExperiments,
  getReliabilityReport,
  startReliabilityExperiment,
  validateReliabilityExperiment,
} from "../../api/myImpact";
import "./AdminReliabilityPage.css";

const DEFAULT_DATASET = "m66-intelligence-comparison-v3";
const DEFAULT_PROMPT = "m66-criterion-assessment-v1";
const NORMALIZATION_VERSION = "m66-reliability-normalization-v1";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function metricValue(metric: Record<string, unknown> | undefined) {
  return typeof metric?.value === "number"
    ? `${(metric.value * 100).toFixed(1)}%`
    : "Not available";
}

export default function AdminReliabilityPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("M6.6.4 repeatability experiment");
  const [datasetId, setDatasetId] = useState(DEFAULT_DATASET);
  const [datasetVersion, setDatasetVersion] = useState(DEFAULT_DATASET);
  const [promptVersion, setPromptVersion] = useState(DEFAULT_PROMPT);
  const [modelIdentifier, setModelIdentifier] = useState("fixture-model");
  const [repetitions, setRepetitions] = useState(3);

  const experimentsQuery = useQuery({
    queryKey: ["admin", "reliability", "experiments"],
    queryFn: getReliabilityExperiments,
  });
  const selected = experimentsQuery.data?.find((item) => item.id === selectedId) ?? null;
  const attemptsQuery = useQuery({
    queryKey: ["admin", "reliability", "attempts", selectedId],
    queryFn: () => getReliabilityAttempts(selectedId!),
    enabled: Boolean(selectedId && selected?.status === "COMPLETED"),
  });
  const comparisonsQuery = useQuery({
    queryKey: ["admin", "reliability", "comparisons", selectedId],
    queryFn: () => getReliabilityComparisons(selectedId!),
    enabled: Boolean(selectedId && selected?.status === "COMPLETED"),
  });
  const reportQuery = useQuery({
    queryKey: ["admin", "reliability", "report", selectedId],
    queryFn: () => getReliabilityReport(selectedId!),
    enabled: Boolean(selectedId && selected?.status === "COMPLETED"),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createReliabilityExperiment({
        name,
        dataset_id: datasetId,
        dataset_version: datasetVersion,
        prompt_version: promptVersion,
        model_identifier: modelIdentifier,
        model_configuration: { temperature: 0 },
        retrieval_configuration_version: "retrieval-v1",
        evaluation_code_version: "m66.6.4",
        output_schema_version: "assessment-v1",
        normalization_version: NORMALIZATION_VERSION,
        repetitions_per_case: repetitions,
      }),
    onSuccess: (experiment) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reliability"] });
      setSelectedId(experiment.id);
    },
  });
  const validateMutation = useMutation({
    mutationFn: () => validateReliabilityExperiment(selectedId!),
  });
  const startMutation = useMutation({
    mutationFn: () => startReliabilityExperiment(selectedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reliability"] });
    },
  });

  if (experimentsQuery.isLoading) return <p role="status">Loading reliability experiments…</p>;
  if (experimentsQuery.isError) {
    return <p role="alert">Could not load experiments: {errorMessage(experimentsQuery.error)}</p>;
  }

  return (
    <div className="admin-reliability-page">
      <header className="admin-reliability-hero">
        <div>
          <div className="eyebrow">M6.6.4 EVALUATION RELIABILITY</div>
          <h1>Repeatability experiments</h1>
          <p>
            Compare repeated structured assessments without confusing consistency
            with correctness.
          </p>
        </div>
      </header>

      <div className="admin-reliability-layout">
        <section className="surface-card admin-reliability-config">
          <div className="card-eyebrow">NEW EXPERIMENT</div>
          <h2>Pin the evaluation inputs</h2>
          <p className="admin-reliability-note">
            Configuration is immutable after creation. Source snapshots that
            cannot be pinned must remain visible as a limitation.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label>Experiment name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Dataset ID<input value={datasetId} onChange={(event) => setDatasetId(event.target.value)} /></label>
            <label>Dataset version<input value={datasetVersion} onChange={(event) => setDatasetVersion(event.target.value)} /></label>
            <label>Prompt version<input value={promptVersion} onChange={(event) => setPromptVersion(event.target.value)} /></label>
            <label>Model identifier<input value={modelIdentifier} onChange={(event) => setModelIdentifier(event.target.value)} /></label>
            <label>Repetitions per case<input type="number" min={1} max={20} value={repetitions} onChange={(event) => setRepetitions(Number(event.target.value))} /></label>
            {createMutation.isError && <p role="alert">{errorMessage(createMutation.error)}</p>}
            <button className="primary-link" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create experiment"}
            </button>
          </form>
        </section>

        <section className="surface-card admin-reliability-list">
          <div className="card-eyebrow">EXPERIMENTS</div>
          <h2>Run history</h2>
          {!experimentsQuery.data?.length && <p>No experiments have been created.</p>}
          {(experimentsQuery.data ?? []).map((experiment) => (
            <button
              className={experiment.id === selectedId ? "reliability-experiment selected" : "reliability-experiment"}
              key={experiment.id}
              type="button"
              onClick={() => setSelectedId(experiment.id)}
            >
              <span>{experiment.name}</span>
              <small>{experiment.status} · {experiment.completed_attempts}/{experiment.planned_attempts} attempts</small>
            </button>
          ))}
        </section>
      </div>

      {selected && (
        <section className="surface-card admin-reliability-detail">
          <div className="section-heading">
            <div>
              <div className="card-eyebrow">EXPERIMENT DETAIL</div>
              <h2>{selected.name}</h2>
            </div>
            {selected.status !== "COMPLETED" && (
              <div className="reliability-actions">
                <button type="button" onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
                  Validate
                </button>
                <button className="primary-link" type="button" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                  {startMutation.isPending ? "Running…" : "Start experiment"}
                </button>
              </div>
            )}
          </div>
          {validateMutation.data && (
            <p className={validateMutation.data.valid ? "reliability-success" : "reliability-error"}>
              {validateMutation.data.valid ? "Configuration is valid." : validateMutation.data.errors.join(" ")}
            </p>
          )}
          {startMutation.isError && <p className="reliability-error" role="alert">{errorMessage(startMutation.error)}</p>}
          {selected.status !== "COMPLETED" ? (
            <p role="status">This experiment is {selected.status.toLowerCase()}. Complete validation before treating results as available.</p>
          ) : reportQuery.isLoading ? (
            <p role="status">Loading reliability report…</p>
          ) : reportQuery.isError ? (
            <p role="alert">Could not load the reliability report: {errorMessage(reportQuery.error)}</p>
          ) : reportQuery.data ? (
            <>
              {reportQuery.data.benchmark && (
                <section className="reliability-benchmark-summary" aria-label="Benchmark governance">
                  <div>
                    <strong>{reportQuery.data.benchmark.dataset_version === "m66-intelligence-comparison-v3" ? "Optimized benchmark" : "Expanded benchmark"}</strong>
                    <span>{String(reportQuery.data.benchmark.case_count)} cases · {String(reportQuery.data.benchmark.dataset_version)}</span>
                  </div>
                  <div>
                    <strong>{String(reportQuery.data.benchmark.label_status ?? "UNKNOWN")}</strong>
                    <span>Human review: {String(reportQuery.data.benchmark.human_review_status ?? "UNKNOWN")} · Thresholds: {String(reportQuery.data.benchmark.threshold_approval_status ?? "UNKNOWN")}</span>
                  </div>
                  <div>
                    <strong>Categories</strong>
                    <span>{(reportQuery.data.benchmark.categories ?? []).join(", ")}</span>
                  </div>
                </section>
              )}
              {reportQuery.data.benchmark?.category_breakdown && (
                <div className="reliability-category-grid" aria-label="Category results">
                  {Object.entries(reportQuery.data.benchmark.category_breakdown).map(([category, summary]) => (
                    <article className="reliability-category" key={category}>
                      <strong>{category.replaceAll("_", " ")}</strong>
                      <span>{summary.complete}/{summary.cases} complete · {summary.divergent} divergent</span>
                    </article>
                  ))}
                </div>
              )}
              {reportQuery.data.benchmark?.metrics && (
                <div className="reliability-governance-metrics" aria-label="Governance metrics">
                  {Object.entries(reportQuery.data.benchmark.metrics).map(([metric, result]) => (
                    <article className="reliability-category" key={metric}>
                      <strong>{metric.replaceAll("_", " ")}</strong>
                      <span>{result.numerator}/{result.denominator} observed · {result.status}</span>
                      <small>{result.reason}</small>
                    </article>
                  ))}
                </div>
              )}
              <div className="reliability-badge">{reportQuery.data.threshold_result === "NOT_EVALUABLE" ? "EXPLORATORY — NO APPROVED THRESHOLD SET" : reportQuery.data.threshold_result}</div>
              <div className="reliability-metric-grid">
                {Object.entries(reportQuery.data.metrics).map(([key, metric]) => (
                  <article className="reliability-metric" key={key}>
                    <div className="card-eyebrow">{key.replaceAll("_", " ")}</div>
                    <strong>{metricValue(metric)}</strong>
                    <small>{String(metric.numerator ?? 0)} / {String(metric.denominator ?? 0)}</small>
                  </article>
                ))}
              </div>
              <h3>Case comparisons</h3>
              <div className="reliability-comparisons">
                {(comparisonsQuery.data ?? []).map((comparison) => (
                  <article className="reliability-comparison" key={comparison.id}>
                    <div>
                      <strong>{comparison.case_id}</strong>
                      <span>{comparison.status}</span>
                    </div>
                    <p>
                      Exact normalized output:{" "}
                      {comparison.exact_output_consistent === null
                        ? "not evaluable"
                        : comparison.exact_output_consistent ? "consistent" : "divergent"}
                    </p>
                    {comparison.difference_categories.length > 0 && (
                      <small>Differences: {comparison.difference_categories.join(", ")}</small>
                    )}
                    {comparison.exclusion_reasons.length > 0 && (
                      <small>Excluded: {comparison.exclusion_reasons.join(" ")}</small>
                    )}
                  </article>
                ))}
              </div>
              <details className="reliability-attempts">
                <summary>Inspect attempts ({attemptsQuery.data?.length ?? 0})</summary>
                {(attemptsQuery.data ?? []).map((attempt) => (
                  <pre key={attempt.id}>{JSON.stringify({
                    id: attempt.id,
                    case_id: attempt.case_id,
                    sequence: attempt.sequence,
                    status: attempt.status,
                    normalized_output: attempt.normalized_output,
                    error_category: attempt.error_category,
                  }, null, 2)}</pre>
                ))}
              </details>
              <ul className="reliability-limitations">
                {reportQuery.data.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
              </ul>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
