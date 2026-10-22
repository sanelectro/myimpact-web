import { useRef, useState } from "react";
import { importDocument } from "../../api/myImpact";
import type { KnowledgeDocument } from "../../types/api";
import "./FileImport.css";

type Props = {
  source?: string;
  title?: string;
  description?: string;
  onImported: (document: KnowledgeDocument) => void;
};

export default function FileImport({
  source = "file_import",
  title = "Import from file",
  description = "Upload a PDF or DOCX. The reusable document pipeline extracts and normalizes the content.",
  onImported,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const document = await importDocument(file, source);
      onImported(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import the file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="file-import-card">
      <input
        ref={inputRef}
        className="file-import-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div>
        <div className="eyebrow">FILE IMPORT</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button
        className="button button-primary"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Processing…" : "Choose file"}
      </button>
      {error && <div className="form-error" role="alert">{error}</div>}
      <small>Maximum 10 MB. Supported formats: PDF and DOCX.</small>
    </div>
  );
}
