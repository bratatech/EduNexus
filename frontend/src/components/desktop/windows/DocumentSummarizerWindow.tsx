import { useEffect, useMemo, useState } from "react";
import { Window } from "../Window";
import { api } from "@/lib/api";
import { UploadCloud, Loader2, Sparkles, FileText, RefreshCcw, Save } from "lucide-react";

type Importance = "high" | "medium" | "low";

interface HighlightedNote {
  note: string;
  importance: Importance;
}

interface DocSummaryRow {
  id: string;
  filename: string;
  mimetype: string;
  title: string;
  classroom_id: string | null;
  created_at: string;
  summary: string;
  highlighted_notes: HighlightedNote[];
}

function importanceStyle(importance: Importance) {
  if (importance === "high") {
    return {
      border: "border-destructive/40",
      bg: "bg-destructive/10",
      text: "text-destructive",
      tag: "HIGH",
    };
  }
  if (importance === "low") {
    return {
      border: "border-muted-foreground/30",
      bg: "bg-muted/40",
      text: "text-muted-foreground",
      tag: "LOW",
    };
  }
  return {
    border: "border-primary/30",
    bg: "bg-primary/10",
    text: "text-primary",
    tag: "MED",
  };
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function DocumentSummarizerWindow() {
  const [list, setList] = useState<DocSummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [busyList, setBusyList] = useState(false);
  const [busySummarize, setBusySummarize] = useState(false);
  const [error, setError] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");

  const selected = useMemo(() => list.find((x) => x.id === selectedId) || null, [list, selectedId]);

  async function refresh() {
    setBusyList(true);
    setError("");
    try {
      const r = (await api.aiDocumentsList()) as { data: DocSummaryRow[] };
      const rows = Array.isArray(r?.data) ? r.data : [];
      setList(rows);
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
      if (selectedId && !rows.some((x) => x.id === selectedId)) setSelectedId(rows[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "failed_to_load");
      setList([]);
    } finally {
      setBusyList(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSummarize() {
    if (!file) {
      setError("missing_document");
      return;
    }

    setBusySummarize(true);
    setError("");

    try {
      const r = (await api.aiDocumentsSummarize({
        file,
        title: title.trim() ? title.trim() : undefined,
      })) as { ok: boolean; data: DocSummaryRow };

      if (r?.data?.id) {
        setList((cur) => [r.data, ...cur]);
        setSelectedId(r.data.id);
        setTitle("");
        setFile(null);
      }
    } catch (e: any) {
      setError(e?.message || "summarize_failed");
    } finally {
      setBusySummarize(false);
    }
  }

  return (
    <Window id="summarizer">
      <div className="flex h-full">
        <aside className="w-72 shrink-0 border-r border-border bg-surface-2/60">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                ./ai/document_summaries
              </div>
              <button
                onClick={() => void refresh()}
                className="grid place-items-center h-8 w-8 rounded-md border border-border bg-surface hover:text-primary hover:border-primary/60 transition-colors"
                title="Refresh"
              >
                {busyList ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Saved</div>
            <div className="space-y-2">
              {list.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-border bg-surface/60 p-3">
                  No summaries yet.
                </div>
              ) : (
                list.map((row) => {
                  const active = row.id === selectedId;
                  return (
                    <button
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`w-full text-left border rounded-md p-3 transition-colors ${
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-surface/60 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-foreground truncate">{row.title || row.filename}</div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 truncate">
                            {row.filename}
                          </div>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                      <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {formatWhen(row.created_at)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-2">
            <div className="border-r border-border bg-background/40 p-5 overflow-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="grid place-items-center h-9 w-9 rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Submit document</div>
                  <div className="text-sm text-foreground">Get summary + highlighted notes</div>
                </div>
              </div>

              {error ? (
                <div className="mb-4 border border-destructive/40 bg-destructive/10 text-destructive p-3 text-xs font-mono">
                  {error}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Optional title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface/60 text-sm outline-none focus:border-primary/60"
                    placeholder="e.g., Biology - Cell structure notes"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Document file
                  </label>
                  <div className="border border-border bg-surface/60 rounded-md p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{file ? file.name : "No file selected"}</div>
                        <div className="text-xs text-muted-foreground mt-1">Supported: text-based files (best with .txt). PDFs/DOCX require server-side parsing.</div>
                      </div>
                      <label className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-background hover:border-primary/60 hover:text-primary transition-colors cursor-pointer">
                        <UploadCloud className="h-4 w-4" />
                        <span className="font-mono text-xs uppercase tracking-widest">Choose</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => void onSummarize()}
                  disabled={busySummarize}
                  className={`w-full h-10 rounded-md border font-mono text-xs uppercase tracking-widest transition-colors ${
                    busySummarize
                      ? "border-border bg-surface text-muted-foreground"
                      : "border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {busySummarize ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {busySummarize ? "Summarizing..." : "Summarize & Save"}
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-background/30 p-5 overflow-auto">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Output</div>
                  <div className="text-sm text-foreground">Saved summary</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selected ? formatWhen(selected.created_at) : ""}
                </div>
              </div>

              {!selected ? (
                <div className="border border-border bg-surface/60 p-4 text-sm text-muted-foreground">
                  Select a saved summary on the left, or submit a document.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="border border-border bg-surface/60 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Title</div>
                    <div className="text-lg text-foreground mt-1">{selected.title || selected.filename}</div>
                    <div className="text-xs text-muted-foreground mt-1">{selected.filename}</div>
                  </div>

                  <div className="border border-border bg-surface/60 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Summary</div>
                    <div className="mt-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{selected.summary}</div>
                  </div>

                  <div className="border border-border bg-surface/60 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Highlighted notes</div>
                    <div className="mt-3 grid gap-2">
                      {(selected.highlighted_notes || []).length === 0 ? (
                        <div className="text-sm text-muted-foreground">No notes returned.</div>
                      ) : (
                        (selected.highlighted_notes || []).map((n, i) => {
                          const s = importanceStyle(n.importance);
                          return (
                            <div
                              key={i}
                              className={`border rounded-md p-3 ${s.border} ${s.bg}`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className={`font-mono text-[10px] uppercase tracking-widest ${s.text}`}>{s.tag}</div>
                                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">#{String(i + 1).padStart(2, "0")}</div>
                              </div>
                              <div className="text-sm text-foreground/90 leading-relaxed">{n.note}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}
