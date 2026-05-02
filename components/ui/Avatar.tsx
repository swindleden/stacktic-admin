/**
 * Square avatar with initials. Mockup uses a 36-40px square at the top of
 * detail headers. Backstage rule: square 6px-radius for orgs and tools,
 * circles only for human users.
 */
export function Avatar({
  name,
  size = 36,
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
      className="rounded bg-paper-2 border border-line grid place-items-center text-ink font-semibold tracking-[0.02em]"
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
