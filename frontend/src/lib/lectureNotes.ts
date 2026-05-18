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

const SECTION_HEADINGS = new Set([
  "overview",
  "key concepts",
  "key concepts and definitions",
  "key concepts & definitions",
  "how it works",
  "process",
  "steps",
  "process and steps",
  "examples",
  "common misconceptions",
  "concept connections",
  "timeline",
  "lecture flow",
  "timeline lecture flow",
  "timeline / lecture flow",
  "quick self-check",
  "glossary",
  "summary",
]);

export function isStrictSectionHeading(line: string): boolean {
  const t = line
    .trim()
    .toLowerCase()
    .replace(/[&:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length > 56) return false;
  if (SECTION_HEADINGS.has(t)) return true;
  if (/^(overview|key concepts|how it works|glossary|timeline|quick self-check|concept connections|common misconceptions)$/i.test(line.trim())) {
    return true;
  }
  return false;
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
  return bullets.slice(0, 24).map((line, i) => ({
    note: line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim(),
    importance: (i < 8 ? "high" : i < 16 ? "medium" : "low") as NoteImportance,
  }));
}

/** Clean plain-text summary for display. */
export function formatLectureSummaryText(summary: string): string {
  let s = stripCodeFences(String(summary || "")).trim();
  if (s.startsWith("{") || s.includes('"highlightedNotes"') || s.includes('"summary"')) {
    const blob = extractJsonObject(s);
    if (blob) {
      try {
        const inner = JSON.parse(blob) as Record<string, unknown>;
        if (typeof inner.summary === "string" && inner.summary.trim()) s = inner.summary.trim();
      } catch { /* keep */ }
    }
  }

  s = s
    .replace(/\r\n/g, "\n")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();

  // Ensure known section titles start on their own line
  const sectionNames = [
    "Overview",
    "Key Concepts",
    "How It Works",
    "Examples",
    "Common Misconceptions",
    "Concept Connections",
    "Timeline / Lecture Flow",
    "Quick Self-Check",
    "Glossary",
  ];
  for (const name of sectionNames) {
    const re = new RegExp(`(^|\\n)\\s*(${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*:?\\s*(?=\n|$)`, "gi");
    s = s.replace(re, `\n\n$2\n`);
  }

  const lines = s.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^[-•*]\s+/.test(trimmed)) return `- ${trimmed.replace(/^[-•*]\s+/, "")}`;
    if (/^\d+\.\s+/.test(trimmed)) return `- ${trimmed.replace(/^\d+\.\s+/, "")}`;
    if (/^(definition|intuition|why it matters|example|common confusion|formula|step)\s*:/i.test(trimmed)) {
      return `  - ${trimmed}`;
    }
    return line.trimEnd();
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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

  if (summary.trim().startsWith("{") || summary.includes('"highlightedNotes"')) {
    const blob = extractJsonObject(summary);
    if (blob) {
      try {
        const inner = JSON.parse(blob) as Record<string, unknown>;
        if (typeof inner.summary === "string" && inner.summary.trim()) summary = inner.summary.trim();
        if (typeof inner.title === "string" && inner.title.trim()) title = inner.title.trim();
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
      } catch { /* ignore */ }
    }
  }

  summary = formatLectureSummaryText(summary);

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
