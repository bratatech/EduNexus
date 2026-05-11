import { useEffect, useMemo, useState } from "react";
import { Window } from "../Window";
import { api } from "@/lib/api";
import { UploadCloud, Loader2, Sparkles, FileText, RefreshCcw, Save, Download } from "lucide-react";
import jsPDF from "jspdf";

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

function normalizeSummaryText(input: string) {
  const s = String(input || "").trim();
  if (!s) return "";

  if (s.startsWith("{") && s.includes("\"summary\"")) {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === "object" && typeof obj.summary === "string") {
        return String(obj.summary || "").trim();
      }
    } catch {
      // ignore
    }
  }

  return s;
}

function stripInlineMarkdown(s: string) {
  return s
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function NotesView({ text }: { text: string }) {
  const lines = useMemo(() => {
    const raw = normalizeSummaryText(text);
    return raw
      .split(/\r?\n/)
      .map((l) => stripInlineMarkdown(l.trimEnd()))
      .filter((l) => l.trim().length > 0);
  }, [text]);

  const blocks = useMemo(() => {
    const out: Array<{ kind: "h" | "li" | "p"; text: string }> = [];
    for (const line of lines) {
      const t = line.trim();
      const isHeading =
        /^(\d+\)|\d+\.|[A-Z][A-Za-z0-9 &/\-]{2,}:)$/.test(t) ||
        /^(Overview|Key concepts|Key Concepts|Definitions|Processes|Steps|Examples|Applications|Pitfalls|Common mistakes)/.test(
          t
        );

      if (isHeading) {
        out.push({ kind: "h", text: t.replace(/:$/, "") });
        continue;
      }

      const bullet = t.match(/^([-*]|\d+\.)\s+(.*)$/);
      if (bullet) {
        out.push({ kind: "li", text: bullet[2] });
        continue;
      }

      out.push({ kind: "p", text: t });
    }
    return out;
  }, [lines]);

  let listKey = 0;
  const rendered: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.kind === "li") {
      const items: string[] = [];
      let j = i;
      while (j < blocks.length && blocks[j].kind === "li") {
        items.push(blocks[j].text);
        j += 1;
      }
      rendered.push(
        <ul key={`ul-${listKey++}`} className="mt-2 ml-5 list-disc space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {it}
            </li>
          ))}
        </ul>
      );
      i = j - 1;
      continue;
    }

    if (b.kind === "h") {
      rendered.push(
        <div key={`h-${i}`} className="mt-4 first:mt-0">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{b.text}</div>
        </div>
      );
      continue;
    }

    rendered.push(
      <p key={`p-${i}`} className="mt-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {b.text}
      </p>
    );
  }

  if (rendered.length === 0) {
    return <div className="text-sm text-muted-foreground">No summary returned.</div>;
  }

  return <div>{rendered}</div>;
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

function safeFilename(name: string) {
  const n = (name || "summary").trim();
  const cleaned = n.replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 80).trim();
  return cleaned || "summary";
}

function downloadSummaryPdf(row: DocSummaryRow) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 48;
  let y = margin;

  function addTitle(text: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 22;
  }

  function addMeta(label: string, value: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(70);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);
    doc.text(value, margin + 90, y);
    y += 16;
  }

  function ensureSpace(nextH: number) {
    if (y + nextH <= pageH - margin) return;
    doc.addPage();
    y = margin;
  }

  function addSectionHeading(text: string) {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(text, margin, y);
    y += 18;
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  }

  function addParagraph(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30);
    const lines = doc.splitTextToSize(text || "", pageW - margin * 2);
    const blockH = lines.length * 14;
    ensureSpace(blockH + 6);
    doc.text(lines, margin, y);
    y += blockH + 6;
  }

  function importanceLabel(imp: Importance) {
    if (imp === "high") return "HIGH";
    if (imp === "low") return "LOW";
    return "MED";
  }

  addTitle(row.title || row.filename || "Document Summary");
  addMeta("Filename:", row.filename || "(unknown)");
  addMeta("Created:", formatWhen(row.created_at || ""));
  y += 10;

  addSectionHeading("Summary");
  addParagraph(row.summary || "");

  addSectionHeading("Highlighted Notes");
  const notes = Array.isArray(row.highlighted_notes) ? row.highlighted_notes : [];
  if (!notes.length) {
    addParagraph("No highlighted notes were returned.");
  } else {
    notes.forEach((n, i) => {
      const tag = importanceLabel(n.importance);
      const prefix = `${String(i + 1).padStart(2, "0")}. [${tag}] `;
      const lines = doc.splitTextToSize(prefix + (n.note || ""), pageW - margin * 2);
      const blockH = lines.length * 14;
      ensureSpace(blockH + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30);
      doc.text(lines, margin, y);
      y += blockH + 6;
    });
  }

  const base = safeFilename(row.title || row.filename || "summary");
  doc.save(`${base}.pdf`);
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
      const code = e?.message || "summarize_failed";
      const friendly: Record<string, string> = {
        gemini_unavailable: "Gemini AI is currently unreachable. Please check your API key or try again later.",
        gemini_not_configured: "Gemini AI is not configured. Set GOOGLE_AI_API_KEY in the backend .env file.",
        gemini_busy: "Gemini AI is overloaded. Please wait a moment and try again.",
        document_text_unreadable: "Could not extract text from this file. Try a plain .txt file.",
        missing_document: "No document file was attached. Please select a file first.",
      };
      setError(friendly[code] || code);
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
                <div className="flex items-center gap-2">
                  {selected ? (
                    <button
                      type="button"
                      onClick={() => downloadSummaryPdf(selected)}
                      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface hover:border-primary/60 hover:text-primary transition-colors"
                      title="Download as PDF"
                    >
                      <Download className="h-4 w-4" />
                      <span className="font-mono text-xs uppercase tracking-widest">Download PDF</span>
                    </button>
                  ) : null}
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {selected ? formatWhen(selected.created_at) : ""}
                  </div>
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
                    <div className="mt-2">
                      <NotesView text={selected.summary} />
                    </div>
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
