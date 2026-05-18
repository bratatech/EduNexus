import { useEffect, useState } from "react";
import {
  ChevronLeft, Clock, Loader2, PlayCircle, CheckCircle2, Layers, ListVideo,
} from "lucide-react";
import { api } from "@/lib/api";

export interface ClassroomTopicSummary {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  video_count: number;
}

export interface ClassroomVideo {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  duration_min: number | null;
  order: number;
  youtube_embed_url: string;
  youtube_watch_url: string;
}

export interface ClassroomTopicPlaylist extends ClassroomTopicSummary {
  videos: ClassroomVideo[];
}

const PROGRESS_KEY = "edunexuz-classroom-progress";

function readProgress(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveWatchProgress(topicId: string, videoId: string) {
  try {
    const p = readProgress();
    p[topicId] = videoId;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export function getResumeVideoId(topicId: string): string | null {
  return readProgress()[topicId] || null;
}

interface TopicPickerProps {
  onSelect: (topicId: string) => void;
}

export function TopicPicker({ onSelect }: TopicPickerProps) {
  const [topics, setTopics] = useState<ClassroomTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = (await api.classroomTopics()) as { data: ClassroomTopicSummary[] };
        if (!cancelled) setTopics(r.data || []);
      } catch (e: unknown) {
        if (!cancelled) {
          const code = e instanceof Error ? e.message : "Failed to load topics";
          const friendly: Record<string, string> = {
            api_unavailable:
              "Cannot reach the API. Start the backend (cd backend && npm start) and restart the frontend dev server.",
            invalid_json: "Server returned an invalid response. Restart the backend to load classroom routes.",
          };
          setError(friendly[code] || code);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-6"
      style={{ background: "rgba(5,5,10,0.92)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-2xl rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(15,15,22,0.98)" }}
      >
        <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Layers className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-widest">Course Library</span>
          </div>
          <h2 className="text-white text-lg font-medium">Select a topic to begin</h2>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Choose your subject first. Previous lectures in that topic will unlock in the playlist.
          </p>
        </div>

        <div className="p-4 max-h-[50vh] overflow-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              Loading topics…
            </div>
          )}
          {error && (
            <div className="text-red-400 text-xs font-mono p-3 rounded-md" style={{ background: "rgba(239,68,68,0.1)" }}>
              {error}
            </div>
          )}
          {!loading && !error && (
            <div className="grid gap-2 sm:grid-cols-2">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className="text-left p-4 rounded-lg transition-all hover:scale-[1.01] group"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{t.icon || "📚"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-medium group-hover:text-amber-300 transition-colors">
                        {t.title}
                      </div>
                      <p className="text-gray-500 text-[11px] mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-amber-400/80">
                        <PlayCircle className="h-3 w-3" />
                        {t.video_count} lecture{t.video_count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlaylistSidebarProps {
  topicId: string;
  selectedVideoId: string | null;
  onVideoSelect: (video: ClassroomVideo) => void;
  onChangeTopic: () => void;
  onPlaylistLoaded?: (playlist: ClassroomTopicPlaylist) => void;
}

export function PlaylistSidebar({
  topicId,
  selectedVideoId,
  onVideoSelect,
  onChangeTopic,
  onPlaylistLoaded,
}: PlaylistSidebarProps) {
  const [playlist, setPlaylist] = useState<ClassroomTopicPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = (await api.classroomTopicPlaylist(topicId)) as { data: ClassroomTopicPlaylist };
        if (cancelled) return;
        const pl = r.data;
        setPlaylist(pl);
        onPlaylistLoaded?.(pl);

        const resumeId = getResumeVideoId(topicId);
        const videos = pl.videos || [];
        const pick =
          videos.find((v) => v.id === selectedVideoId) ||
          videos.find((v) => v.id === resumeId) ||
          videos[0];
        if (pick) onVideoSelect(pick);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load playlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const videos = playlist?.videos || [];
  const currentIdx = videos.findIndex((v) => v.id === selectedVideoId);

  return (
    <div
      className="w-64 flex flex-col border-r shrink-0"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(12,12,18,0.97)" }}
    >
      <div className="px-3 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={onChangeTopic}
          className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-amber-400 transition-colors mb-2"
        >
          <ChevronLeft className="h-3 w-3" /> Change topic
        </button>
        {playlist && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg">{playlist.icon}</span>
              <span className="text-white text-sm font-medium truncate">{playlist.title}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-gray-500">
              <ListVideo className="h-3 w-3 text-amber-400/70" />
              {videos.length} lectures in playlist
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        )}
        {error && (
          <p className="text-red-400 text-xs font-mono p-2">{error}</p>
        )}
        {!loading && videos.map((v, i) => {
          const active = v.id === selectedVideoId;
          const watched = currentIdx > i;
          return (
            <button
              key={v.id}
              onClick={() => {
                saveWatchProgress(topicId, v.id);
                onVideoSelect(v);
              }}
              className="w-full text-left p-2.5 rounded-md transition-all"
              style={{
                background: active ? "rgba(245,158,11,0.12)" : "transparent",
                border: `1px solid ${active ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.05)"}`,
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="shrink-0 grid place-items-center h-5 w-5 rounded text-[10px] font-mono mt-0.5"
                  style={{
                    background: active ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
                    color: active ? "#fbbf24" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {watched && !active ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs leading-snug ${active ? "text-amber-300" : "text-gray-300"}`}>
                    {v.title}
                  </div>
                  {v.duration_min != null && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-600 font-mono">
                      <Clock className="h-2.5 w-2.5" />
                      {v.duration_min} min
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {videos.length > 1 && currentIdx >= 0 && (
        <div className="p-2 border-t flex gap-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            disabled={currentIdx <= 0}
            onClick={() => onVideoSelect(videos[currentIdx - 1])}
            className="flex-1 py-1.5 rounded text-[10px] font-mono disabled:opacity-30 text-gray-400 hover:text-white hover:bg-white/5"
          >
            ← Prev
          </button>
          <button
            disabled={currentIdx >= videos.length - 1}
            onClick={() => onVideoSelect(videos[currentIdx + 1])}
            className="flex-1 py-1.5 rounded text-[10px] font-mono disabled:opacity-30 text-gray-400 hover:text-white hover:bg-white/5"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
