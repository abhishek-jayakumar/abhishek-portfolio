"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { PLATFORMS, platformLabel, type Account, type PlatformId } from "@/lab/paid/model";
import { FIELDS, combine, importCsv, sampleCsv, type ImportResult } from "@/lab/paid/import";
import { totals } from "@/lab/paid/metrics";
import { formatNumber } from "@/lab/shared/lib/format";
import { SelectField } from "@/lab/shared/ui/controls";
import { EmptyState } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import p from "./paid.module.css";
import { usd } from "./shared";

const MAX_BYTES = 5 * 1024 * 1024;
const LEVEL_WORD = { error: "Error", warning: "Skipped", info: "Note" } as const;

type Props = {
  demo: Account;
  account: Account;
  imports: ImportResult[];
  onImports: (r: ImportResult[]) => void;
  onUse: (a: Account) => void;
  onDemo: () => void;
  onOpen: (module: string) => void;
};

export function ImportPanel({ demo, account, imports, onImports, onUse, onDemo, onOpen }: Props) {
  const inputId = useId();
  const [platform, setPlatform] = useState<PlatformId | "auto">("auto");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const read = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    const results: ImportResult[] = [];
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        results.push({ ...importCsv("", f.name), issues: [{ level: "error", message: `The file is ${formatNumber(f.size / 1024 / 1024, { dp: 1 })} MB; the limit is 5 MB. Export a shorter date range or fewer columns.`, count: 1, examples: [] }] });
        continue;
      }
      results.push(importCsv(await f.text(), f.name, platform));
    }
    // Keep earlier files, replacing any with the same name.
    const next = [...imports.filter((r) => !results.some((x) => x.fileName === r.fileName)), ...results];
    onImports(next);
    const rows = combine(next);
    if (rows.length) {
      const names = next.filter((r) => r.ok).map((r) => r.fileName);
      onUse({ source: "import", label: names.join(", "), rows });
    }
    track("lab_paid_import", results.map((r) => `${r.platform ?? "unknown"}:${r.ok ? "ok" : "fail"}`).join(","));
    setBusy(false);
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    void read(Array.from(e.target.files ?? []));
    e.target.value = "";
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    void read(Array.from(e.dataTransfer.files));
  };

  const download = (pl: PlatformId) => {
    const csv = sampleCsv(demo.rows, pl);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `northstar-${pl}-ads-sample.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    track("lab_paid_sample", pl);
  };

  const clear = () => {
    onImports([]);
    onDemo();
  };

  const t = totals(account.rows);

  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Bring your own exports</h3>
          <p className={s.note}>
            Upload campaign reports from Google Ads, Meta Ads Manager or LinkedIn Campaign Manager: daily rows by campaign, as CSV. Each file is read in your browser and never
            leaves this page. Columns are matched by name, so you don&rsquo;t need to rename anything. One file per platform; a second file for the same platform replaces the
            first.
          </p>
          <div
            className={`${p.drop} ${over ? p.dropOn : ""}`}
            style={{ marginTop: "0.9rem" }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <label htmlFor={inputId} className={s.fieldLabel}>
              Choose CSV files, or drop them here
            </label>
            <input id={inputId} className={p.fileInput} type="file" accept=".csv,.tsv,.txt,text/csv" multiple onChange={onFiles} disabled={busy} />
            <SelectField
              label="If the platform can't be recognised, treat it as"
              value={platform}
              onChange={setPlatform}
              options={[{ value: "auto", label: "Ask me (recognise from columns)" }, ...PLATFORMS.map((pl) => ({ value: pl.id, label: pl.label }))]}
            />
            <p className={s.note} role="status" aria-live="polite">
              {busy ? "Reading…" : ""}
            </p>
          </div>
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}>No exports to hand? Try a sample</h3>
          <p className={s.note}>
            Each sample is the last four weeks of the demo account written the way that platform exports it: Google&rsquo;s report title lines, &ldquo;Impr.&rdquo; and a totals
            row; Meta&rsquo;s &ldquo;Amount spent (USD)&rdquo;, reach and regions; LinkedIn&rsquo;s US dates and &ldquo;--&rdquo; for empty values. Download one or all three,
            then upload them here.
          </p>
          <div className={p.row} style={{ marginTop: "0.9rem" }}>
            {PLATFORMS.map((pl) => (
              <button key={pl.id} type="button" className={s.btnGhost} onClick={() => download(pl.id)}>
                {pl.label} sample <span aria-hidden="true">↓</span>
              </button>
            ))}
          </div>
          <dl className={s.formulas} style={{ marginTop: "1rem" }}>
            <div>
              <dt>Now showing</dt>
              <dd>
                {account.source === "demo" ? "The demo account" : `Your import: ${account.label}`} · {formatNumber(t.rows)} rows · {usd(t.spend)} spend · {formatNumber(t.leads)} leads
              </dd>
            </div>
            <div>
              <dt>Required columns</dt>
              <dd>{FIELDS.filter((f) => f.required).map((f) => f.label).join(", ")}</dd>
            </div>
            <div>
              <dt>Optional</dt>
              <dd>{FIELDS.filter((f) => !f.required).map((f) => f.label).join(", ")}. Without qualified leads there&rsquo;s no CPA; without a value column, no ROAS.</dd>
            </div>
          </dl>
          {account.source === "import" && (
            <div className={p.row} style={{ marginTop: "1rem" }}>
              <button type="button" className={s.btn} onClick={() => onOpen("analytics")}>
                See your data in Campaign analytics
              </button>
              <button type="button" className={s.btnGhost} onClick={clear}>
                Clear imports and use demo data
              </button>
            </div>
          )}
        </div>
      </div>

      {imports.length === 0 ? (
        <EmptyState title="Nothing imported yet">
          <p>The studio is showing the demo account. Import a file, or a sample above, to see how its columns are matched and what the checks find.</p>
        </EmptyState>
      ) : (
        imports.map((r) => <ImportReport key={r.fileName} r={r} />)
      )}
    </>
  );
}

function ImportReport({ r }: { r: ImportResult }) {
  const t = totals(r.rows);
  return (
    <section className={s.card} aria-label={`Import report: ${r.fileName}`}>
      <h3 className={s.cardTitle}>
        {r.fileName}{" "}
        <span className={r.ok ? p.pill : p.pillImport}>{r.ok ? `${platformLabel(r.platform as PlatformId)}${r.detected ? "" : " (as chosen)"}` : "Not imported"}</span>
      </h3>
      {r.ok && (
        <p className={s.note}>
          Imported {formatNumber(r.rows.length)} of {formatNumber(r.read)} data rows: {usd(t.spend)} spend, {formatNumber(t.impressions)} impressions, {formatNumber(t.clicks)} clicks,{" "}
          {formatNumber(t.leads)} leads.
        </p>
      )}
      {r.issues.length > 0 && (
        <ul className={p.issues} aria-label="What the checks found">
          {r.issues.map((i) => (
            <li key={i.message}>
              <span className={`${p.level} ${p[`lv_${i.level}`]}`}>{LEVEL_WORD[i.level]}</span>
              <span>
                {i.message}
                {i.count > 1 && ` (${formatNumber(i.count)} rows)`}
                {i.examples.length > 0 && <span className={s.note}> Line{i.examples.length === 1 ? "" : "s"} {i.examples.join(", ")}{i.count > i.examples.length ? ", …" : ""}.</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {r.header.length > 0 && (
        <>
          <h4 className={s.cardTitle} style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            How the columns were matched
          </h4>
          <dl className={p.mapGrid}>
            {FIELDS.map((f) => (
              <div key={f.id}>
                <dt>
                  {f.label}
                  {f.required ? "" : " (optional)"}
                </dt>
                <dd>{r.mapping[f.id] ? `“${r.mapping[f.id]}”` : <span className={p.missing}>{f.required ? "missing" : "not in file"}</span>}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {r.preview.length > 0 && (
        <details className={s.evidence} style={{ marginTop: "0.8rem" }}>
          <summary>Preview the first {r.preview.length} rows as read</summary>
          <div className={s.tableWrap} tabIndex={0} role="region" aria-label={`Preview of ${r.fileName}`} style={{ marginTop: "0.6rem" }}>
            <table className={s.table}>
              <thead>
                <tr>
                  {r.header.map((h, i) => (
                    <th key={`${h}-${i}`} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.preview.map((row, i) => (
                  <tr key={i}>
                    {r.header.map((_, j) => (
                      <td key={j}>{row[j] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
