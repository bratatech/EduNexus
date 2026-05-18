import { useCallback, useEffect, useState } from "react";
import { Window } from "../Window";
import { api } from "@/lib/api";
import { normalizePracticeSet, gradeMcqLocal, type PracticeSet, type McqGradeResult } from "@/lib/practiceQuiz";
import { downloadPracticePdf } from "@/lib/practicePdf";
import { Loader2, Download, Sparkles, CheckCircle2, XCircle, ClipboardList, BookOpen } from "lucide-react";

interface TopicRow {
  id: string;
  title: string;
  description?: string;
  video_count?: number;
  icon?: string;
}

interface VideoRow {
  id: string;
  title: string;
  description?: string;
}

export function PracticeWindow() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [scope, setScope] = useState<"topic" | "lecture">("topic");
  const [topicId, setTopicId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [numMcq, setNumMcq] = useState(5);
  const [numShort, setNumShort] = useState(3);
  const [numTheory, setNumTheory] = useState(2);
  const [mcqOnly, setMcqOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [set, setSet] = useState<PracticeSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grade, setGrade] = useState<McqGradeResult | null>(null);
  const [tab, setTab] = useState<"setup" | "quiz" | "review">("setup");

  useEffect(() => {
    api.classroomTopics().then((r) => {
      const list = (r.data || []) as TopicRow[];
      setTopics(list);
      if (list[0] && !topicId) setTopicId(list[0].id);
    }).catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    if (!topicId) return;
    api.classroomTopicPlaylist(topicId).then((r) => {
      const pl = r.data as { videos?: VideoRow[] };
      setVideos(pl?.videos || []);
      if (pl?.videos?.[0]) setVideoId(pl.videos[0].id);
    }).catch(() => setVideos([]));
  }, [topicId]);

  useEffect(() => {
    if (mcqOnly) {
      setNumShort(0);
      setNumTheory(0);
    }
  }, [mcqOnly]);

  const selectedTopic = topics.find((t) => t.id === topicId);
  const selectedVideo = videos.find((v) => v.id === videoId);

  const applyPracticeSet = useCallback(
    (raw: unknown) => {
      const data = normalizePracticeSet(raw, selectedTopic?.title || "Practice");
      setSet(data);
      setGrade(null);
      setAnswers({});
      setTab(mcqOnly && data.mcq.length ? "quiz" : "review");
    },
    [mcqOnly, selectedTopic]
  );

  const loadFromBank = useCallback(async () => {
    if (!topicId) return;
    setBusy(true);
    setError("");
    try {
      const r =
        scope === "lecture" && videoId
          ? await api.practiceByLecture(topicId, videoId)
          : await api.practiceByTopic(topicId);
      applyPracticeSet(r.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Question bank not found for this selection.");
    } finally {
      setBusy(false);
    }
  }, [topicId, scope, videoId, applyPracticeSet]);

  const generate = useCallback(async () => {
    if (!topicId) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.aiPracticeGenerate({
        topicId,
        topicTitle: selectedTopic?.title,
        videoId: scope === "lecture" ? videoId : undefined,
        videoTitle: scope === "lecture" ? selectedVideo?.title : undefined,
        numMcq: mcqOnly ? numMcq : numMcq,
        numShort: mcqOnly ? 0 : numShort,
        numTheory: mcqOnly ? 0 : numTheory,
      });
      applyPracticeSet(r.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "generation_failed";
      setError(`${msg} — try “Load from question bank” (no API key needed).`);
    } finally {
      setBusy(false);
    }
  }, [topicId, scope, videoId, numMcq, numShort, numTheory, mcqOnly, selectedTopic, selectedVideo, applyPracticeSet]);

  const submitMcq = () => {
    if (!set) return;
    const result = gradeMcqLocal(set, answers);
    setGrade(result);
    setTab("review");
  };

  return (
    <Window id="practice">
      <div className="flex h-full font-mono text-sm" style={{ background: "#0a0a0f", color: "#e8d5c0" }}>
        <div className="w-80 shrink-0 border-r p-4 overflow-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            <span className="text-amber-400 font-medium">AI Question Practice</span>
          </div>

          <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Scope</label>
          <div className="flex gap-2 mb-3">
            {(["topic", "lecture"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="flex-1 py-1.5 text-xs rounded-md border"
                style={{
                  borderColor: scope === s ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)",
                  background: scope === s ? "rgba(245,158,11,0.12)" : "transparent",
                  color: scope === s ? "#fbbf24" : "#888",
                }}
              >
                {s === "topic" ? "Whole topic" : "One lecture"}
              </button>
            ))}
          </div>

          <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Topic</label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="w-full mb-3 px-2 py-2 text-xs rounded-md bg-black/40 border border-white/10 text-gray-200"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ""}{t.title}</option>
            ))}
          </select>

          {scope === "lecture" && (
            <>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Lecture</label>
              <select
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                className="w-full mb-3 px-2 py-2 text-xs rounded-md bg-black/40 border border-white/10 text-gray-200"
              >
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </>
          )}

          <label className="flex items-center gap-2 mb-3 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={mcqOnly} onChange={(e) => setMcqOnly(e.target.checked)} />
            MCQ only (solve in app)
          </label>

          <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">MCQ count</label>
          <input
            type="number" min={0} max={20} value={numMcq}
            onChange={(e) => setNumMcq(Number(e.target.value))}
            className="w-full mb-2 px-2 py-1.5 text-xs rounded-md bg-black/40 border border-white/10"
          />
          {!mcqOnly && (
            <>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Short answer</label>
              <input
                type="number" min={0} max={15} value={numShort}
                onChange={(e) => setNumShort(Number(e.target.value))}
                className="w-full mb-2 px-2 py-1.5 text-xs rounded-md bg-black/40 border border-white/10"
              />
              <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Theory / long</label>
              <input
                type="number" min={0} max={10} value={numTheory}
                onChange={(e) => setNumTheory(Number(e.target.value))}
                className="w-full mb-3 px-2 py-1.5 text-xs rounded-md bg-black/40 border border-white/10"
              />
            </>
          )}

          {error && (
            <div className="mb-3 p-2 text-xs text-red-400 border border-red-500/30 rounded-md bg-red-500/10">{error}</div>
          )}

          <button
            onClick={loadFromBank}
            disabled={busy || !topicId}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-medium mb-2"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#86efac" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            Load from question bank
          </button>

          <button
            onClick={generate}
            disabled={busy || !topicId}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate with AI"}
          </button>

          {set && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => downloadPracticePdf(set, "questions")}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs rounded-md border border-white/10 hover:bg-white/5"
              >
                <Download className="h-3 w-3" /> Questions PDF
              </button>
              <button
                onClick={() => downloadPracticePdf(set, "solutions")}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs rounded-md border border-white/10 hover:bg-white/5"
              >
                <Download className="h-3 w-3" /> Solutions PDF
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!set ? (
            <div className="flex-1 grid place-items-center text-gray-500 text-xs p-8 text-center">
              Pick a topic and load curated questions from the bank, or generate a custom set with AI. MCQ-only mode lets you answer and submit for instant scoring.
            </div>
          ) : tab === "quiz" && set.mcq.length ? (
            <div className="flex-1 overflow-auto p-6">
              <h2 className="text-amber-400 text-sm mb-4">Answer all questions, then submit</h2>
              <div className="space-y-6 max-w-2xl">
                {set.mcq.map((q, qi) => (
                  <div key={q.id} className="rounded-lg p-4 border border-white/10 bg-white/[0.02]">
                    <p className="text-sm text-gray-200 mb-3 font-medium">Q{qi + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.choices.map((c, ci) => (
                        <label key={ci} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === ci}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                          />
                          <span>{String.fromCharCode(65 + ci)}. {c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={submitMcq}
                  className="px-6 py-2.5 rounded-md text-sm bg-amber-500/20 border border-amber-500/40 text-amber-300"
                >
                  Submit answers
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              {grade && (
                <div
                  className="mb-6 p-4 rounded-lg border"
                  style={{
                    borderColor: grade.percent >= 70 ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)",
                    background: grade.percent >= 70 ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
                  }}
                >
                  <p className="text-lg font-bold text-white">
                    Score: {grade.score}/{grade.total} ({grade.percent}%)
                  </p>
                </div>
              )}

              {set.mcq.map((q, i) => {
                const gr = grade?.results.find((r) => r.id === q.id);
                return (
                  <div key={q.id} className="mb-8">
                    <h3 className="text-amber-400 text-xs uppercase tracking-wider mb-2">Multiple choice</h3>
                    <div className="rounded-lg p-4 border border-white/10">
                      <p className="text-sm text-gray-200 mb-2">Q{i + 1}. {q.question}</p>
                      {q.choices.map((c, ci) => (
                        <p key={ci} className="text-xs text-gray-500 ml-2"> {String.fromCharCode(65 + ci)}. {c}</p>
                      ))}
                      {gr && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          {gr.correct ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                          <span className={gr.correct ? "text-green-400" : "text-red-400"}>
                            {gr.correct ? "Correct" : `Correct: ${String.fromCharCode(65 + gr.correctIndex)}`}
                          </span>
                        </div>
                      )}
                      {q.explanation && <p className="text-xs text-gray-500 mt-2 italic">{q.explanation}</p>}
                    </div>
                  </div>
                );
              })}

              {set.shortAnswer.map((q, i) => (
                <div key={q.id} className="mb-6 rounded-lg p-4 border border-white/10">
                  <p className="text-[10px] text-amber-500 uppercase mb-1">Short answer {i + 1}</p>
                  <p className="text-sm text-gray-200 mb-2">{q.question}</p>
                  <p className="text-xs text-green-400/90"><span className="text-gray-500">Answer: </span>{q.modelAnswer}</p>
                </div>
              ))}

              {set.theory.map((q, i) => (
                <div key={q.id} className="mb-6 rounded-lg p-4 border border-white/10">
                  <p className="text-[10px] text-amber-500 uppercase mb-1">Theory {i + 1}</p>
                  <p className="text-sm text-gray-200 mb-2">{q.question}</p>
                  <p className="text-xs text-green-400/90 leading-relaxed"><span className="text-gray-500">Model answer: </span>{q.modelAnswer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}
