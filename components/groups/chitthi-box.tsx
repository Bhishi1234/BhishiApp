export function ChitthiBox({
  title,
  names,
  muted = false,
}: {
  title: string;
  names: string[];
  muted?: boolean;
}) {
  if (names.length === 0) return null;

  return (
    <div
      className={
        muted
          ? "rounded-3xl bg-secondary/70 p-4"
          : "rounded-3xl border-2 border-dashed border-primary/30 bg-[#eff6ff] p-4"
      }
    >
      <p className={muted ? "text-sm font-semibold" : "text-sm font-semibold text-primary"}>
        {title} · {names.length}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {names.map((name) => (
          <span
            key={name}
            className={
              muted
                ? "rounded-full bg-white px-3 py-1.5 text-sm text-muted-foreground"
                : "rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.08)]"
            }
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
