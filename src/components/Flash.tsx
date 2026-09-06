export default function Flash({ err, ok }: { err?: string; ok?: string }) {
  if (!err && !ok) return null;
  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
        err
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-ok/30 bg-ok-soft text-ok"
      }`}
    >
      {err ?? ok}
    </div>
  );
}
