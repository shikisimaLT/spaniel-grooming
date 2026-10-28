// Shown instantly while a new back-office page is being rendered on the server.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Memuat halaman">
      <div className="mb-6 border-b-2 border-ink pb-4">
        <div className="skel h-3 w-24" />
        <div className="skel mt-3 h-9 w-64" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rule-top pt-3">
            <div className="skel h-3 w-20" />
            <div className="skel mt-3 h-9 w-40" />
          </div>
        ))}
      </div>
      <div className="panel mt-8 space-y-3">
        <div className="skel h-5 w-48" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skel h-8 w-full" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
