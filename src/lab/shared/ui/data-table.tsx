"use client";

import { useMemo, useState, type ReactNode } from "react";
import { isNum } from "@/lab/shared/lib/safe-math";
import s from "./lab.module.css";

export type Column<R> = {
  key: string;
  label: string;
  align?: "left" | "right";
  /** How the cell reads. Defaults to the raw value. */
  render?: (row: R) => ReactNode;
  /** What sorting compares. Defaults to row[key]. Nulls always sort last. */
  sortValue?: (row: R) => number | string | null;
  sortable?: boolean;
};

/** A sortable table: the accessible view behind every chart, and the main view for detail data. */
export function DataTable<R extends Record<string, unknown>>({
  columns,
  rows,
  caption,
  initialSort,
  rowKey,
  maxHeight,
  empty = "No rows match the current filters.",
}: {
  columns: Column<R>[];
  rows: R[];
  caption: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  rowKey: (row: R) => string;
  maxHeight?: string;
  empty?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue ?? ((r: R) => r[col.key] as number | string | null);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const na = va === null || va === undefined || (typeof va === "number" && !isNum(va));
      const nb = vb === null || vb === undefined || (typeof vb === "number" && !isNum(vb));
      if (na && nb) return 0;
      if (na) return 1;
      if (nb) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) =>
    setSort((cur) => (cur?.key === key ? { key, dir: cur.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  return (
    <div className={s.tableWrap} style={maxHeight ? { maxHeight } : undefined} tabIndex={0} role="region" aria-label={caption}>
      <table className={s.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const on = sort?.key === c.key;
              const ariaSort = on ? (sort?.dir === "asc" ? "ascending" : "descending") : "none";
              return (
                <th key={c.key} scope="col" aria-sort={c.sortable === false ? undefined : ariaSort} className={c.align === "right" ? s.num : undefined}>
                  {c.sortable === false ? (
                    c.label
                  ) : (
                    <button type="button" className={s.sortBtn} onClick={() => toggle(c.key)}>
                      {c.label}
                      <span aria-hidden="true" className={on ? s.sortOn : s.sortOff}>
                        {on && sort?.dir === "asc" ? "↑" : "↓"}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={s.emptyCell}>
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? s.num : undefined}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
