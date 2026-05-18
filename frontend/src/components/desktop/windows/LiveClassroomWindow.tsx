import { useState, useCallback, Suspense, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Window } from "../Window";
import { useWindowManager } from "@/lib/window-manager";
import {
  Mic, MicOff, Video, VideoOff, Hand, MessageSquare,
  Monitor, LogOut, RotateCcw, Users, FileText, Download,
  Loader2, Sparkles, BookOpen, ListVideo,
} from "lucide-react";
import { api } from "@/lib/api";
import { normalizeLectureNotes, type HighlightedNote, type LectureNotesData } from "@/lib/lectureNotes";
import jsPDF from "jspdf";

import { Floor, Walls, ClassroomLights, Bench, TeacherDesk, DustParticles } from "./classroom/ClassroomEnvironment";
import {
  STUDENTS, StudentCharacter, CameraAnimation, Smartboard, CelebrationParticles,
} from "./classroom/ClassroomInteractives";
import {
  TopicPicker, PlaylistSidebar, saveWatchProgress,
  type ClassroomVideo, type ClassroomTopicPlaylist,
} from "./classroom/ClassroomPlaylist";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMsg { id: number; user: string; text: string; time: string; }

function renderSummaryText(summary: string) {
  return summary.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    const isHeading =
      /^[A-Z][A-Za-z0-9 /&'()-]{2,48}$/.test(trimmed) &&
      !trimmed.startsWith("-") &&
      !/^\d+\./.test(trimmed);
    if (isHeading) {
      return (
        <div key={i} className="text-amber-300/95 text-xs font-semibold tracking-wide mt-3 mb-1 first:mt-0">
          {trimmed}
        </div>
      );
    }
    return (
      <p key={i} className="text-xs text-gray-400 leading-relaxed">
        {line}
      </p>
    );
  });
}

// ─── PDF download helper ──────────────────────────────────────────────────────
function downloadNotesPdf(data: LectureNotesData, videoTitle?: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 48;
  let y = m;

  const ensureSpace = (h: number) => { if (y + h > ph - m) { doc.addPage(); y = m; } };

  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(data.title || videoTitle || "Lecture Notes", pw - m * 2);
  doc.text(titleLines, m, y); y += titleLines.length * 22 + 8;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Generated: ${new Date(data.created_at).toLocaleString()}`, m, y); y += 20;
  doc.text(`Source: ${videoTitle || "Lecture video"}`, m, y); y += 24;

  ensureSpace(28);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20);
  doc.text("Lecture Summary & Notes", m, y); y += 18;
  doc.setDrawColor(200); doc.line(m, y, pw - m, y); y += 12;

  const summaryLines = doc.splitTextToSize(data.summary || "", pw - m * 2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30);
  for (const line of summaryLines) {
    ensureSpace(14);
    doc.text(line, m, y); y += 14;
  }
  y += 10;

  ensureSpace(28);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20);
  doc.text("Key Highlighted Notes", m, y); y += 18;
  doc.line(m, y, pw - m, y); y += 12;

  (data.highlighted_notes || []).forEach((n, i) => {
    const tag = n.importance === "high" ? "HIGH" : n.importance === "low" ? "LOW" : "MED";
    const lines = doc.splitTextToSize(`${String(i + 1).padStart(2, "0")}. [${tag}] ${n.note}`, pw - m * 2);
    ensureSpace(lines.length * 13 + 6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30);
    doc.text(lines, m, y); y += lines.length * 13 + 6;
  });

  const fname = (data.title || videoTitle || "lecture_notes").replace(/[^a-z0-9\-_ ]/gi, "_").slice(0, 60).trim() || "lecture_notes";
  doc.save(`${fname}.pdf`);
}

// ─── Notes panel ─────────────────────────────────────────────────────────────
interface NotesPanelProps {
  video: ClassroomVideo | null;
  topic: ClassroomTopicPlaylist | null;
  classroomId?: string;
}

function NotesPanel({ video, topic, classroomId }: NotesPanelProps) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<LectureNotesData | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "highlights">("summary");
  const [cached, setCached] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    setNotes(null);
    setError("");
    setCached(false);
    if (!video) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await api.aiLectureNotesCached({ videoId: video.id, topicId: video.topic_id });
        if (!cancelled && r.data) {
          setNotes(normalizeLectureNotes(r.data, video.title));
          setCached(true);
        }
      } catch { /* no cached notes yet */ }
    })();
    return () => { cancelled = true; };
  }, [video?.id, video?.topic_id]);

  const generateNotes = useCallback(async () => {
    if (!video || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await api.aiLectureNotes({
        videoUrl: video.youtube_watch_url,
        title: video.title,
        classroomId,
        topicId: video.topic_id,
        videoId: video.id,
        topicTitle: topic?.title,
        topicDescription: topic?.description,
        videoDescription: video.description,
      }) as { ok: boolean; data: LectureNotesData; cached?: boolean };
      if (r?.data) {
        setNotes(normalizeLectureNotes(r.data, video.title));
        setCached(!!r.cached);
      }
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : "generation_failed";
      const friendly: Record<string, string> = {
        missing_token: "Please log in to generate class notes.",
        invalid_token: "Session expired. Log in again, then retry.",
        gemini_not_configured: "Gemini AI is not configured. Set GOOGLE_AI_API_KEY in backend .env.",
        gemini_busy: "Gemini AI is overloaded. Please retry in a moment.",
        ai_timeout: "Video analysis took too long. Please retry — first run can take 2–4 minutes.",
        gemini_unavailable: "Gemini AI is unreachable. Check API key and connectivity.",
        invalid_body: "Invalid lecture video URL.",
      };
      setError(friendly[code] || code);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [video, topic, classroomId]);

  if (!video) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center" style={{ background: "rgba(10,10,16,0.98)" }}>
        <BookOpen className="h-8 w-8 text-gray-600 mb-3" />
        <p className="text-gray-500 text-xs">Select a lecture from the playlist to view or generate notes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(10,10,16,0.98)" }}>
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-white truncate">Lecture Notes</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate pl-6">{video.title}</p>
        </div>
        {notes && (
          <button
            onClick={() => downloadNotesPdf(notes, video.title)}
            title="Download PDF"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono shrink-0"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#fbbf24" }}
          >
            <Download className="h-3 w-3" /> PDF
          </button>
        )}
      </div>

      {notes ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {cached && (
            <div className="px-4 py-1.5 text-[10px] font-mono text-green-400/80" style={{ background: "rgba(74,222,128,0.06)" }}>
              Saved notes loaded
            </div>
          )}
          <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {(["summary", "highlights"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors"
                style={{
                  background: activeTab === tab ? "rgba(245,158,11,0.1)" : "transparent",
                  color: activeTab === tab ? "#fbbf24" : "rgba(255,255,255,0.4)",
                  borderBottom: activeTab === tab ? "2px solid #f59e0b" : "2px solid transparent",
                }}
              >
                {tab === "summary" ? "Summary" : `Highlights (${(notes.highlighted_notes || []).length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === "summary" ? (
              <div>
                <div className="text-amber-400 text-sm font-medium mb-3">{notes.title}</div>
                <div className="space-y-0.5">{renderSummaryText(notes.summary)}</div>
              </div>
            ) : (
              <div className="space-y-2">
                {(notes.highlighted_notes || []).length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-6">
                    No highlights yet. Use &quot;Regenerate notes&quot; below to create key points.
                  </p>
                )}
                {(notes.highlighted_notes || []).map((n, i) => {
                  const colors = {
                    high: { border: "rgba(239,68,68,0.3)", bg: "rgba(239,68,68,0.07)", tag: "rgba(239,68,68,0.9)", label: "HIGH" },
                    medium: { border: "rgba(245,158,11,0.3)", bg: "rgba(245,158,11,0.07)", tag: "rgba(245,158,11,0.9)", label: "MED" },
                    low: { border: "rgba(148,163,184,0.2)", bg: "rgba(148,163,184,0.05)", tag: "rgba(148,163,184,0.6)", label: "LOW" },
                  }[n.importance];
                  return (
                    <div key={i} className="rounded-md p-3" style={{ border: `1px solid ${colors.border}`, background: colors.bg }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: colors.tag }}>{colors.label}</span>
                        <span className="text-[10px] font-mono text-gray-600">#{String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{n.note}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <button
              onClick={generateNotes}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono"
              style={{ border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Regenerate notes
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {error && (
            <div
              className="w-full mb-4 text-xs p-3 rounded-md text-left font-mono"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
            >
              {error}
            </div>
          )}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <Sparkles className="h-6 w-6 text-amber-400" />
          </div>
          <div className="text-white text-sm font-medium mb-2">AI Lecture Notes</div>
          <div className="text-gray-500 text-xs leading-relaxed max-w-52 mb-5">
            Generate detailed, structured notes for this lecture video using Gemini AI.
          </div>
          <button
            onClick={generateNotes}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: busy ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.18)",
              border: "1px solid rgba(245,158,11,0.4)",
              color: busy ? "rgba(245,158,11,0.5)" : "#fbbf24",
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate Notes"}
          </button>
          {busy && (
            <div className="mt-3 text-[10px] font-mono text-gray-600 leading-relaxed text-center">
              Watching lecture with Gemini AI
              <br />
              Usually takes 2–4 minutes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LiveClassroomWindow() {
  const { close } = useWindowManager();

  const [presentIds, setPresentIds] = useState<Set<number>>(new Set());
  const allPresent = presentIds.size === STUDENTS.length;
  const markPresent = useCallback((id: number) => {
    setPresentIds((prev) => { if (prev.has(id)) return prev; const n = new Set(prev); n.add(id); return n; });
  }, []);
  const resetAttendance = useCallback(() => setPresentIds(new Set()), []);

  const [isLive, setIsLive] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicPlaylist, setTopicPlaylist] = useState<ClassroomTopicPlaylist | null>(null);
  const [currentVideo, setCurrentVideo] = useState<ClassroomVideo | null>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, user: "Alex Chen", text: "Welcome! Select a topic to access the lecture playlist.", time: "10:00" },
    { id: 2, user: "System", text: `${STUDENTS.length} students in classroom`, time: "10:01" },
  ]);

  const handleTopicSelect = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    setTopicPlaylist(null);
    setCurrentVideo(null);
    setPlaylistOpen(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), user: "System", text: "Topic selected — playlist unlocked.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
  }, []);

  const handleVideoSelect = useCallback((video: ClassroomVideo) => {
    setCurrentVideo(video);
    if (selectedTopicId) saveWatchProgress(selectedTopicId, video.id);
  }, [selectedTopicId]);

  const handleChangeTopic = useCallback(() => {
    setSelectedTopicId(null);
    setTopicPlaylist(null);
    setCurrentVideo(null);
  }, []);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), user: "You", text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setChatInput("");
  };

  function handleEndClass() {
    setIsLive(false);
    setNotesOpen(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), user: "System", text: "Class ended. Generate notes for any lecture in the playlist.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
  }

  return (
    <Window id="classroom">
      <div className="flex h-full" style={{ background: "#0a0a0f" }}>
        {selectedTopicId && playlistOpen && (
          <PlaylistSidebar
            topicId={selectedTopicId}
            selectedVideoId={currentVideo?.id ?? null}
            onVideoSelect={handleVideoSelect}
            onChangeTopic={handleChangeTopic}
            onPlaylistLoaded={setTopicPlaylist}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            {!selectedTopicId && <TopicPicker onSelect={handleTopicSelect} />}

            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0f" }}>
                  <div className="text-center">
                    <div className="text-5xl mb-4 animate-pulse">🎓</div>
                    <div className="text-amber-400 font-mono text-sm">Loading 3D Classroom…</div>
                  </div>
                </div>
              }
            >
              <Canvas shadows camera={{ position: [0, 15, 25], fov: 50 }} style={{ background: "#0a0a0f" }}>
                <CameraAnimation />
                <ClassroomLights />
                <Floor />
                <Walls />
                {selectedTopicId && currentVideo && (
                  <Smartboard
                    videoEmbedUrl={currentVideo.youtube_embed_url}
                    videoTitle={currentVideo.title}
                    topicTitle={topicPlaylist?.title}
                  />
                )}
                {selectedTopicId && !currentVideo && (
                  <Smartboard topicTitle={topicPlaylist?.title || "Select a lecture"} />
                )}
                <TeacherDesk />
                {STUDENTS.map((s) => <Bench key={`bench-${s.id}`} position={s.benchPos} />)}
                {STUDENTS.map((s) => (
                  <StudentCharacter key={s.id} student={s} isPresent={presentIds.has(s.id)} onMark={markPresent} />
                ))}
                <DustParticles />
                <CelebrationParticles active={allPresent} />
                <OrbitControls makeDefault minDistance={4} maxDistance={20} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2 - 0.05} target={[0, 3, -2]} />
              </Canvas>
            </Suspense>

            <div
              className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full max-w-[50%]"
              style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${isLive ? "rgba(239,68,68,0.3)" : "rgba(74,222,128,0.3)"}` }}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${isLive ? "bg-red-500 animate-pulse" : "bg-green-400"}`} />
              <span className={`text-xs font-mono uppercase tracking-wider shrink-0 ${isLive ? "text-red-400" : "text-green-400"}`}>
                {isLive ? "Live" : "Ended"}
              </span>
              {topicPlaylist && (
                <span className="text-gray-500 text-xs truncate">• {topicPlaylist.title}</span>
              )}
            </div>

            <div
              className="absolute top-3 right-3 flex items-center gap-3 px-4 py-2 rounded-lg"
              style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${allPresent ? "rgba(74,222,128,0.4)" : "rgba(240,163,90,0.2)"}` }}
            >
              <Users className="h-4 w-4 text-amber-400" />
              <div className="font-mono text-xs">
                <span className={allPresent ? "text-green-400" : "text-amber-400"}>{presentIds.size}/{STUDENTS.length}</span>
                <span className="text-gray-500 ml-1.5">attendance</span>
              </div>
              <button onClick={resetAttendance} title="Reset" className="grid place-items-center h-6 w-6 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            {allPresent && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-lg font-mono text-sm animate-bounce"
                style={{ background: "linear-gradient(135deg,rgba(74,222,128,0.2),rgba(34,197,94,0.15))", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" }}>
                🎉 All Present!
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => setMuted(!muted)}
                className={`grid place-items-center h-10 w-10 rounded-full transition-all ${muted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white border border-white/20"}`}>
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button onClick={() => setVideoOn(!videoOn)}
                className={`grid place-items-center h-10 w-10 rounded-full transition-all ${!videoOn ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white border border-white/20"}`}>
                {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
              <button onClick={() => setHandRaised(!handRaised)}
                className={`grid place-items-center h-10 w-10 rounded-full transition-all ${handRaised ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/10 text-white border border-white/20"}`}>
                <Hand className="h-4 w-4" />
              </button>
              <button onClick={() => { setChatOpen(!chatOpen); setNotesOpen(false); }}
                className={`grid place-items-center h-10 w-10 rounded-full transition-all ${chatOpen ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/10 text-white border border-white/20"}`}>
                <MessageSquare className="h-4 w-4" />
              </button>
              {selectedTopicId && (
                <button
                  onClick={() => setPlaylistOpen(!playlistOpen)}
                  title="Lecture playlist"
                  className={`grid place-items-center h-10 w-10 rounded-full transition-all ${playlistOpen ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/10 text-white border border-white/20"}`}
                >
                  <ListVideo className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => { setNotesOpen(!notesOpen); setChatOpen(false); }}
                title="Lecture notes"
                disabled={!currentVideo}
                className={`grid place-items-center h-10 w-10 rounded-full transition-all disabled:opacity-40 ${notesOpen ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/10 text-white border border-white/20"}`}
              >
                <FileText className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button className="grid place-items-center h-10 w-10 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all">
                <Monitor className="h-4 w-4" />
              </button>
              {isLive ? (
                <button onClick={handleEndClass} title="End Class" className="grid place-items-center h-10 w-10 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all">
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => close("classroom")} title="Close" className="grid place-items-center h-10 w-10 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all">
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {chatOpen && (
          <div className="w-72 flex flex-col border-l shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,20,0.95)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-white text-sm font-medium">Chat</h3>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${msg.user === "You" ? "text-amber-400" : msg.user === "System" ? "text-cyan-400" : "text-gray-300"}`}>{msg.user}</span>
                    <span className="text-[10px] text-gray-600">{msg.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message…"
                  className="flex-1 px-3 py-2 text-xs rounded-md outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#e8d5c0", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button type="submit" className="px-3 py-2 rounded-md text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">Send</button>
              </form>
            </div>
          </div>
        )}

        {notesOpen && (
          <div className="w-80 flex flex-col border-l shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <NotesPanel video={currentVideo} topic={topicPlaylist} classroomId="classroom-live" />
          </div>
        )}
      </div>
    </Window>
  );
}
