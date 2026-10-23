import { useQuery } from "@tanstack/react-query";
import { getKnowledgeDocuments } from "../../api/myImpact";

export default function KnowledgePage() {
  const query = useQuery({ queryKey: ["source-documents"], queryFn: getKnowledgeDocuments });
  if (query.isLoading) return <p>Loading source documents…</p>;
  if (query.isError) return <p>Could not load source documents: {query.error instanceof Error ? query.error.message : "Unknown error"}</p>;
  const docs = query.data ?? [];
  return <div><div className="page-heading"><div className="eyebrow">SOURCE DOCUMENTS</div><h1>Documents connected to your goals</h1><p>Review documents used to inform goals and their expectations.</p></div><div className="detail-list">{docs.map((doc) => <article className="detail-card static-card" key={doc.id}><div><span className="status-pill">{doc.status}</span><h2>{doc.file_name}</h2><p>{doc.document_type} · {doc.content_type}</p></div><span className="detail-arrow">→</span></article>)}</div>{!docs.length && <div className="surface-card"><p>No source documents are connected yet.</p></div>}</div>;
}
