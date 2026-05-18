import { BookMarked, CircleDot, Lightbulb, ListChecks, Quote } from "lucide-react";
import { formatLectureSummaryText, isStrictSectionHeading } from "@/lib/lectureNotes";

const SECTION_ICONS: Record<string, typeof BookMarked> = {
  overview: BookMarked,
  "key concepts": Lightbulb,
  glossary: Quote,
  "quick self-check": ListChecks,
  timeline: CircleDot,
};

function iconForHeading(text: string) {
  const key = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  for (const [k, Icon] of Object.entries(SECTION_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return BookMarked;
}

export function LectureNotesSummaryView({ summary }: { summary: string }) {
  const text = formatLectureSummaryText(summary);

  if (!text.trim()) {
    return (
      <p className="text-xs text-gray-500 text-center py-6 leading-relaxed">
        No summary text yet. Click <span className="text-amber-400">Regenerate notes</span> to create structured lecture notes.
      </p>
    );
  }

  const lines = text.split("\n");

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        if (isStrictSectionHeading(trimmed)) {
          const Icon = iconForHeading(trimmed);
          return (
            <div
              key={i}
              className="flex items-center gap-2 mt-5 mb-2 first:mt-0 pt-1 border-t border-white/5 first:border-t-0 first:pt-0"
            >
              <span
                className="grid place-items-center h-6 w-6 rounded-md shrink-0"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <Icon className="h-3.5 w-3.5 text-amber-400" />
              </span>
              <h3 className="text-amber-300/95 text-xs font-semibold tracking-wide uppercase">{trimmed}</h3>
            </div>
          );
        }

        const conceptMatch = trimmed.match(/^concept\s*:\s*(.+)$/i);
        if (conceptMatch) {
          return (
            <div key={i} className="text-[11px] font-semibold text-amber-200/95 mt-3 mb-1 pl-1">
              {conceptMatch[1]}
            </div>
          );
        }

        const bulletMatch = line.match(/^(\s*)-\s+(.*)$/);
        if (bulletMatch) {
          const indent = bulletMatch[1].length;
          const body = bulletMatch[2];
          const labelMatch = body.match(/^([A-Za-z][A-Za-z ]+):\s*(.+)$/);
          const isLabel =
            labelMatch &&
            /^(definition|intuition|why it matters|example|common confusion|formula|step)/i.test(labelMatch[1]);

          if (isLabel && labelMatch) {
            return (
              <div key={i} className={`mb-1.5 ${indent >= 2 ? "ml-4" : "ml-1"}`}>
                <span className="text-[10px] font-mono uppercase tracking-wide text-amber-500/80">
                  {labelMatch[1]}
                </span>
                <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">{labelMatch[2]}</p>
              </div>
            );
          }

          return (
            <div key={i} className={`flex gap-2 mb-1.5 ${indent >= 2 ? "ml-5" : "ml-1"}`}>
              <span
                className="shrink-0 mt-[0.45em] h-1.5 w-1.5 rounded-full"
                style={{ background: indent >= 2 ? "rgba(148,163,184,0.5)" : "rgba(245,158,11,0.7)" }}
              />
              <p className="text-[11px] text-gray-300 leading-relaxed flex-1">{body}</p>
            </div>
          );
        }

        return (
          <p key={i} className="text-[11px] text-gray-300 leading-relaxed mb-2">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

