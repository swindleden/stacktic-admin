import type { ReactNode } from "react";

/**
 * The bordered, rounded card every data table sits inside. Owns the chrome
 * (border / shadow / overflow clipping) so individual pages don't have to
 * repeat the wrapper. Optional `footer` slot for Pagination.
 *
 * Visual chrome matches the Backstage Table primitive (paper-4 fill, line
 * border, paper-3 head + footer). Th/Td helpers below render the same
 * mono-uppercase header style and ink-2 body cells.
 */
export function TableCard({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Border uses `line-strong` rather than `line` so the table edge
  // sits visibly darker than the header/footer bg (`paper-2`),
  // framing the table as a discrete card. The `dark:` inset shadow
  // adds a 1px highlight at the top edge in dark mode — a long-
  // standing dark-UI trick that makes cards feel raised against
  // the page without adding heavy chrome. Light mode doesn't need
  // it; the warm-cream surface already reads as raised against
  // the slightly-darker page.
  return (
    <div className="bg-paper-4 border border-line-strong rounded-md overflow-hidden dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
      {footer ? (
        // Footer bg matches the header (`paper-2`) so the table reads
        // as a clearly bracketed slab — body rows on `paper-4`,
        // chrome (head + foot) on the darker `paper-2`. Earlier
        // `paper-3` left the footer barely distinguishable from the
        // body and broke the head/foot symmetry.
        <div className="flex justify-between items-center px-[18px] py-2.5 border-t border-line-strong bg-paper-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="text-left px-[18px] py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase font-medium text-muted">
      {children}
    </th>
  );
}

export function ThNum({ children }: { children: ReactNode }) {
  return (
    <th className="text-right px-[18px] py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase font-medium text-muted">
      {children}
    </th>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-[18px] py-3 align-middle text-[13.5px] text-ink-2 tracking-[-0.005em]">{children}</td>;
}

export function TdNum({ children }: { children: ReactNode }) {
  return (
    <td className="px-[18px] py-3 align-middle text-right font-mono text-[12.5px] font-medium text-ink [font-feature-settings:'tnum']">
      {children}
    </td>
  );
}

/**
 * Standard `<thead>` + `<tbody>` row classes.
 *
 * Header bg uses `paper-2` rather than `paper-3` so the header row is
 * actually darker than the page (`paper`) — the original paper-3
 * (#FDFBF6) was *lighter* than the page (#FAF7F0), giving the header
 * a "translucent" feel that blended with both the card body and the
 * surrounding page. paper-2 (#F1EDE3) is the warm-side token below
 * page and reads as a clear bordered band at the top of the table.
 *
 * Body row hover stays `paper-3` so hovered rows feel like a brighter
 * surface (lift effect), not a darker one. Separating header bg from
 * hover bg also keeps the active hover state visible even when the
 * mouse moves over the header row.
 */
export const tableHeadClass = "bg-paper-2 border-b border-line";
export const tableBodyRowClass =
  "border-t border-line-soft hover:bg-paper-3 transition-colors";
