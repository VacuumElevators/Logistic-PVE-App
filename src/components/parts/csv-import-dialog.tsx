"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { apiFetch } from "@/lib/api-fetch";
import { PART_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const SAMPLE_CSV = `sku,name,description,category,quantity,reorderLevel
ACME-001,Sample bracket,Mounting bracket,General Parts,25,5
PVE37-001,PVE37 latch,Cabin latch for PVE37,PVE37 Parts,8,4`;

export function CsvImportButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5" /> Import CSV
      </Button>
      {open && <CsvImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function CsvImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [csvText, setCsvText] = React.useState<string>("");
  const [mode, setMode] = React.useState<"upsert" | "create">("upsert");
  const [dragging, setDragging] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onClose]);

  async function pickFile(f: File) {
    setError(null);
    setResult(null);
    setFile(f);
    const text = await f.text();
    setCsvText(text);
  }

  async function submit() {
    if (!csvText) {
      setError("Choose a CSV file first.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await apiFetch("/api/parts/import", {
      method: "POST",
      body: JSON.stringify({ csv: csvText, mode }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Import failed.");
      return;
    }
    setResult(json.data as ImportResult);
    router.refresh();
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "parts-sample.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function reset() {
    setFile(null);
    setCsvText("");
    setResult(null);
    setError(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/30"
        onClick={() => !loading && onClose()}
      />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 animate-fade-in">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 pt-5 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Import Parts from CSV
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Up to 2,000 rows. Required columns:{" "}
              <code>sku</code>, <code>name</code>, <code>category</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) await pickFile(f);
                }}
                className={cn(
                  "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  dragging
                    ? "border-brand-400 bg-brand-50/50"
                    : "border-slate-200 bg-slate-50/50",
                )}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-700">
                    <FileText className="h-5 w-5 text-brand-500" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-slate-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={reset}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-7 w-7 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-700">
                      Drag & drop a CSV file here, or{" "}
                      <label className="font-medium text-brand-600 hover:underline cursor-pointer">
                        browse
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) pickFile(f);
                          }}
                        />
                      </label>
                    </p>
                    <button
                      type="button"
                      onClick={downloadSample}
                      className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Download a sample CSV →
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="import-mode"
                    className="text-xs font-medium text-slate-700"
                  >
                    If a part number already exists
                  </label>
                  <Combobox
                    id="import-mode"
                    value={mode}
                    onChange={(v) => setMode(v as "upsert" | "create")}
                    className="h-9 w-56"
                    options={[
                      { value: "upsert", label: "Update existing rows" },
                      { value: "create", label: "Skip existing rows" },
                    ]}
                  />
                </div>
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer font-medium text-slate-700">
                    Valid categories
                  </summary>
                  <ul className="mt-1.5 space-y-0.5">
                    {PART_CATEGORIES.map((c) => (
                      <li key={c}>
                        <code>{c}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
            </>
          )}

          {result && <ResultPanel result={result} />}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
          {result ? (
            <>
              <Button variant="secondary" onClick={reset}>
                Import another
              </Button>
              <Button onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={loading || !csvText}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: ImportResult }) {
  const ok = result.errors.length === 0;
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3",
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800",
        )}
      >
        {ok ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
        <p className="text-sm">
          {result.imported} created · {result.updated} updated ·{" "}
          {result.skipped} skipped
        </p>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Row errors ({result.errors.length})
          </p>
          <ul className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {result.errors.slice(0, 100).map((e) => (
              <li key={e.row} className="px-4 py-2 text-xs text-slate-700">
                <span className="font-mono text-slate-500">row {e.row}</span> —{" "}
                {e.message}
              </li>
            ))}
            {result.errors.length > 100 && (
              <li className="px-4 py-2 text-xs text-slate-400">
                + {result.errors.length - 100} more…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
