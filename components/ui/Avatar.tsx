/**
 * Square avatar with initials. Mockup uses a 40px square at the top of the
 * company-detail header. We default to that size; callers can override.
 */
export function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const initials = (name.match(/\b[A-Za-z0-9]/g) ?? [])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="rounded-md bg-surface-subtle border border-border-soft grid place-items-center text-slate font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
      }}
      aria-hidden
    >
      {initials || "—"}
    </div>
  );
}
