export default function Flash({ err, ok }: { err?: string; ok?: string }) {
  if (!err && !ok) return null;
  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
        err
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {err ?? ok}
    </div>
  );
}
