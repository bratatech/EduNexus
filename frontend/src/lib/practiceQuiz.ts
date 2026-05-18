export interface McqQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface WrittenQuestion {
  id: string;
  question: string;
  modelAnswer: string;
  rubric?: string;
}

export interface PracticeSet {
  title: string;
  topicTitle: string;
  scopeLabel: string;
  mcq: McqQuestion[];
  shortAnswer: WrittenQuestion[];
  theory: WrittenQuestion[];
}

export interface McqGradeResult {
  score: number;
  total: number;
  percent: number;
  results: { id: string; correct: boolean; chosen: number; correctIndex: number; explanation: string }[];
}

function stripFences(t: string) {
  return String(t || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractJson(text: string): string {
  const s = stripFences(text);
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return "";
  return s.slice(a, b + 1);
}

export function normalizePracticeSet(raw: unknown, fallbackTitle = "Practice Set"): PracticeSet {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  let blob = r;
  if (typeof r === "string" || (typeof r.title === "undefined" && extractJson(String(r)))) {
    try {
      blob = JSON.parse(extractJson(String(r))) as Record<string, unknown>;
    } catch { /* */ }
  }

  const mapMcq = (arr: unknown[]): McqQuestion[] =>
    arr
      .map((item, i) => {
        const o = item as Record<string, unknown>;
        const choices = Array.isArray(o.choices) ? o.choices.map((c) => String(c)) : [];
        return {
          id: String(o.id || `mcq-${i + 1}`),
          question: String(o.question || "").trim(),
          choices: choices.length >= 2 ? choices : ["A", "B", "C", "D"],
          correctIndex: Math.max(0, Math.min(Number(o.correctIndex ?? o.answer ?? 0), choices.length - 1)),
          explanation: String(o.explanation || o.reason || "").trim(),
        };
      })
      .filter((q) => q.question.length > 0);

  const mapWritten = (arr: unknown[]): WrittenQuestion[] =>
    arr
      .map((item, i) => {
        const o = item as Record<string, unknown>;
        return {
          id: String(o.id || `q-${i + 1}`),
          question: String(o.question || "").trim(),
          modelAnswer: String(o.modelAnswer || o.answer || o.solution || "").trim(),
          rubric: o.rubric ? String(o.rubric) : undefined,
        };
      })
      .filter((q) => q.question.length > 0);

  const mcq = mapMcq(Array.isArray(blob.mcq) ? blob.mcq : []);
  const shortAnswer = mapWritten(Array.isArray(blob.shortAnswer) ? blob.shortAnswer : []);
  const theory = mapWritten(Array.isArray(blob.theory) ? blob.theory : []);

  return {
    title: String(blob.title || fallbackTitle),
    topicTitle: String(blob.topicTitle || ""),
    scopeLabel: String(blob.scopeLabel || ""),
    mcq,
    shortAnswer,
    theory,
  };
}

export function gradeMcqLocal(set: PracticeSet, answers: Record<string, number>): McqGradeResult {
  const results = set.mcq.map((q) => {
    const chosen = answers[q.id] ?? -1;
    const correct = chosen === q.correctIndex;
    return {
      id: q.id,
      correct,
      chosen,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    };
  });
  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  return {
    score,
    total,
    percent: total ? Math.round((score / total) * 100) : 0,
    results,
  };
}
