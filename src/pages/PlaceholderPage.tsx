export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <div className="eyebrow">M6</div>
      <h1>{title}</h1>
      <p>This product area will be implemented in the next M6 milestone.</p>
    </div>
  );
}
