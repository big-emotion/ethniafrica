import type { ChapterTable } from "@/lib/dossiers/nommer/types";

interface SourcedTableProps {
  table: ChapterTable;
}

/**
 * A chapter's table, in a region a keyboard can reach.
 *
 * `role="region"` with an accessible name and `tabIndex={0}` is the part that
 * matters. `mobile-text.css` leaves tables left-aligned on purpose, but a
 * four-column table still overflows at 430 px — and an `overflow-x-auto` box
 * that is not focusable is a box a keyboard-only reader can never scroll. The
 * right-hand columns would simply not exist for them.
 *
 * The caption is the region's name rather than a `<caption>` alone, so the
 * name a screen reader announces on entering the scroll container is the same
 * sentence a sighted reader sees above it.
 */
// @req REQ-113
export const SourcedTable = ({ table }: SourcedTableProps) => (
  <div
    role="region"
    aria-label={table.caption}
    tabIndex={0}
    className="overflow-x-auto focus-visible:shadow-[var(--afh-ring-focus)]"
  >
    <table>
      <caption className="text-left text-afh-caption text-afh-text-soft">
        {table.caption}
      </caption>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.cells.join("|")}>
            {row.cells.map((cell, index) =>
              index === 0 ? (
                <th key={cell} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={cell}>{cell}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
