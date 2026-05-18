export type NoteImportance = "high" | "medium" | "low";

export interface HighlightedNote {
  note: string;
  importance: NoteImportance;
}

export interface LectureNotesData {
  id?: string;
  title: string;
  summary: string;
  highlighted_notes: HighlightedNote[];
  created_at?: string;
}

function stripCodeFences(text: string): string {
  return String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractJsonObject(text: string): string {
  const s = stripCodeFences(text);
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last <= first) return "";
  return s.slice(first, last + 1);
}

function extractHighlightsFromSummary(summary: string): HighlightedNote[] {
  const lines = summary.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-•*]\s+/.test(l) || /^\d+\.\s+/.test(l));
  return bullets.slice(0, 22).map((line, i) => ({
    note: line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim(),
    importance: (i < 8 ? "high" : i < 15 ? "medium" : "low") as NoteImportance,
  }));
}

/** Ensure notes are human-readable plain text, not raw JSON blobs. */
export function normalizeLectureNotes(raw: unknown, fallbackTitle = "Lecture Notes"): LectureNotesData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  let title = String(r.title || fallbackTitle);
  let summary = String(r.summary || "");
  let highlights: HighlightedNote[] = [];

  const rawHighlights = r.highlighted_notes ?? r.highlightedNotes;
  if (Array.isArray(rawHighlights)) {
    highlights = rawHighlights
      .map((n) => {
        const item = n as Record<string, unknown>;
        const note = String(item.note || item.text || "").trim();
        const imp = item.importance;
        const importance: NoteImportance =
          imp === "high" || imp === "low" || imp === "medium" ? imp : "medium";
        return { note, importance };
      })
      .filter((n) => n.note.length > 0);
  }

  const tryParseSummaryJson = (text: string) => {
    const blob = extractJsonObject(text) || stripCodeFences(text);
    if (!blob.startsWith("{")) return false;
    try {
      const inner = JSON.parse(blob) as Record<string, unknown>;
      if (typeof inner.summary === "string" && inner.summary.trim()) {
        summary = inner.summary.trim();
      }
      if (typeof inner.title === "string" && inner.title.trim()) {
        title = inner.title.trim();
      }
      const innerHl = inner.highlightedNotes ?? inner.highlighted_notes;
      if (Array.isArray(innerHl) && innerHl.length) {
        highlights = (innerHl as Record<string, unknown>[])
          .map((item) => ({
            note: String(item.note || item.text || "").trim(),
            importance: (["high", "medium", "low"].includes(String(item.importance))
              ? item.importance
              : "medium") as NoteImportance,
          }))
          .filter((n) => n.note.length > 0);
      }
      return true;
    } catch {
      return false;
    }
  };

  if (summary.trim().startsWith("{") || summary.includes('"highlightedNotes"')) {
    tryParseSummaryJson(summary);
  }

  summary = stripCodeFences(summary)
    .replace(/^\s*\{\s*"title"\s*:/im, "")
    .trim();

  if (highlights.length < 5 && summary.length > 200) {
    const derived = extractHighlightsFromSummary(summary);
    if (derived.length > highlights.length) highlights = derived;
  }

  return {
    id: r.id as string | undefined,
    title,
    summary,
    highlighted_notes: highlights,
    created_at: r.created_at as string | undefined,
  };
}
