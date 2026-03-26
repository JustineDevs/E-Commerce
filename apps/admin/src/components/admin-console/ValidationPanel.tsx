export function ValidationPanel({
  errors,
  title = "Fix these before saving",
}: {
  errors: string[];
  title?: string;
}) {
  if (!errors.length) return null;
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-red-800">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
