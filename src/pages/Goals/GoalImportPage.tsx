import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import FileImport from "../../components/FileImport/FileImport";
import { importGoalsFromDocument } from "../../api/myImpact";
import type { Goal, KnowledgeDocument } from "../../types/api";
import "./GoalImport.css";

export default function GoalImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState<Array<{ title: string; existing_goal_id: string }>>([]);
  const [error, setError] = useState("");
  const [hasProcessedImport, setHasProcessedImport] = useState(false);

  const mutation = useMutation({
    mutationFn: (document: KnowledgeDocument) => importGoalsFromDocument(document.id),
    onSuccess: async (result) => {
      setGoals(result.imported_goals);
      setSkippedDuplicates(result.skipped_duplicates);
      setError("");
      setHasProcessedImport(true);
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (err) => {
      setGoals([]);
      setSkippedDuplicates([]);
      setHasProcessedImport(false);
      setError(err instanceof Error ? err.message : "Could not extract goals.");
    },
  });

  function handleImported(document: KnowledgeDocument) {
    setGoals([]);
    setSkippedDuplicates([]);
    setHasProcessedImport(false);
    setError("");
    mutation.mutate(document);
  }

  return (
    <div className="goal-import-page">
      <Link className="back-link" to="/goals">← All goals</Link>
      <header className="goal-import-header">
        <div className="eyebrow">ADD / IMPORT GOALS</div>
        <h1>Add goals your way</h1>
        <p>Keep manual creation simple, or import a file through the reusable document pipeline. Imported goals are always created as drafts for your review.</p>
      </header>

      <div className="goal-import-options">
        <button className="goal-import-option" type="button" onClick={() => navigate("/goals/new")}>
          <span className="goal-import-icon">✏️</span>
          <strong>Create manually</strong>
          <small>Enter a goal directly using the existing goal form.</small>
        </button>
        <div className="goal-import-file-option">
          <FileImport
            title="Import goals from a file"
            description="Upload a source document. The document pipeline extracts its content, then goal extraction identifies one or more goals for review."
            onImported={handleImported}
          />
        </div>
      </div>

      {mutation.isPending && <div className="goal-import-processing">Reading the document and identifying goals…</div>}
      {error && <div className="form-error" role="alert">{error}</div>}

      {(hasProcessedImport || goals.length > 0 || skippedDuplicates.length > 0) && (
        <section className="goal-import-results">

        {skippedDuplicates.length > 0 && (
          <div className="goal-import-duplicates" role="status">
            <strong>{skippedDuplicates.length} duplicate goal{skippedDuplicates.length === 1 ? "" : "s"} skipped</strong>
            <p>These goals already exist with the same scope, so importing the same content from another file did not create another copy.</p>
            <ul>
              {skippedDuplicates.map((duplicate) => (
                <li key={`${duplicate.existing_goal_id}-${duplicate.title}`}>{duplicate.title}</li>
              ))}
            </ul>
          </div>
        )}
          {goals.length > 0 ? (
            <>
              <div className="eyebrow">DRAFT GOALS</div>
              <h2>Review the imported goals</h2>
              <p>Nothing is activated automatically. Open each draft, refine it if needed, then approve it.</p>
              <div className="goal-import-list">
                {goals.map((goal) => (
                  <div className="goal-import-result" key={goal.id}>
                    <div>
                      <span className="goal-import-status">DRAFT · NEEDS REVIEW</span>
                      <h3>{goal.title}</h3>
                      <p>{goal.description || "No description extracted."}</p>
                      <small>Scope: {goal.scope}</small>
                    </div>
                    <Link className="button button-secondary" to={`/goals/${goal.id}/edit`}>Review / edit</Link>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="goal-import-no-new">
              {skippedDuplicates.length > 0
                ? "No new goals were added from this document."
                : "No goals were identified in this document."}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
