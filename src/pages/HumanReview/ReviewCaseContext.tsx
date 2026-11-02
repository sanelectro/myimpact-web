interface ReviewCaseContextProps {
  caseContext: Record<string, unknown>;
  heading: string;
  eyebrow: string;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
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
