import { useEffect, useMemo, useRef, useState } from "react";
import { Window } from "../Window";
import { api } from "@/lib/api";
import { Download, Loader2, Mic, MicOff, Sparkles, Trash2, Volume2 } from "lucide-react";
import jsPDF from "jspdf";

type TutorMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

function normalizeTtsText(text: string) {
  const t = String(text || "").replace(/\s+$/g, "").trim();
  if (!t) return "";
  return t.slice(0, 3900);
}

function nowId(suffix: string) {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${suffix}`;
}

function getUserWallet() {
  try {
    const raw = localStorage.getItem("edunexuz-user");
    if (!raw) return "guest";
    const u = JSON.parse(raw);
    return String(u?.wallet || u?.username || u?.id || "guest");
  } catch {
    return "guest";
  }
}

function safeFilename(name: string) {
  const n = (name || "tutor-chat").trim();
  const cleaned = n.replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 80).trim();
  return cleaned || "tutor-chat";
}

export function AITutorWindow() {
  const wallet = useMemo(() => getUserWallet(), []);
  const storageKey = useMemo(() => `edunexuz-tutor-history:${wallet}:desktop`, [wallet]);

  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState<TutorMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized: TutorMsg[] = parsed
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            id: String((x as any).id || nowId("m")),
            role: (String((x as any).role) === "assistant" ? "assistant" : "user") as TutorMsg["role"],
            text: String((x as any).text || ""),
            createdAt: Number((x as any).createdAt || Date.now()),
          }))
          .filter((m) => m.text.trim().length > 0);
        setMsgs(normalized.slice(-60));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(msgs.slice(-60)));
    } catch {
      // ignore
    }
  }, [msgs, storageKey]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  async function ask() {
    if (!prompt.trim()) return;
    const q = prompt.trim();
    setBusy(true);
    setError("");
    setPrompt("");

    setMsgs((prev) =>
      [...prev, { id: nowId("q"), role: "user" as const, text: q, createdAt: Date.now() }].slice(-60)
    );

    try {
      const r = await api.aiTutor(q);
      const a = String(r?.answer || "").trim();
      setMsgs((prev) =>
        [...prev, { id: nowId("a"), role: "assistant" as const, text: a || "(empty answer)", createdAt: Date.now() }].slice(-60)
      );
    } catch (e: any) {
      const msg = String(e?.message || "unknown_error");
      setError(msg);
      setMsgs((prev) =>
        [...prev, { id: nowId("e"), role: "assistant" as const, text: `AI error: ${msg}`, createdAt: Date.now() }].slice(-60)
      );
    } finally {
      setBusy(false);
    }
  }

  async function speakLastAnswer() {
    const last = [...msgs].reverse().find((m) => m.role === "assistant" && m.text.trim());
    if (!last) return;

    setVoiceBusy(true);
    setError("");
    try {
      const safeText = normalizeTtsText(last.text);
      if (!safeText) {
        setError("missing_text");
        return;
      }
      const r = await api.aiVoiceTts(safeText);
      const b64 = (r as any)?.audioBase64;
      const mime = (r as any)?.audioMime || "audio/mpeg";
      if (!b64) {
        setError("voice_unavailable");
        return;
      }
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e: any) {
      setError(String(e?.message || "voice_playback_failed"));
    } finally {
      setVoiceBusy(false);
    }
  }

  function downloadChatPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const margin = 48;
    let y = margin;

    function ensureSpace(nextH: number) {
      if (y + nextH <= pageH - margin) return;
      doc.addPage();
      y = margin;
    }

    function addLines(lines: string[], lineH: number) {
      for (const line of lines) {
        ensureSpace(lineH);
        doc.text(line, margin, y);
        y += lineH;
      }
    }

    function addTitle(text: string) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      doc.setTextColor(20);
      addLines(lines, 20);
      y += 10;
    }

    function addLine(label: string, value: string) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(70);
      ensureSpace(16);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      doc.text(value, margin + 80, y);
      y += 16;
    }

    function addMsg(role: string, text: string) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40);
      ensureSpace(18);
      doc.text(role, margin, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(20);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      addLines(lines, 14);
      y += 10;
    }

    addTitle("AI Tutor Chat");
    addLine("User:", wallet);
    addLine("Export:", new Date().toLocaleString());
    y += 8;

    if (!msgs.length) {
      addMsg("(empty)", "No messages.");
    } else {
      msgs.forEach((m) => addMsg(m.role === "user" ? "YOU" : "TUTOR", m.text));
    }

    doc.save(`${safeFilename(`ai-tutor-chat-${wallet}`)}.pdf`);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordedChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        setVoiceBusy(true);
        try {
          const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          const data = await api.aiVoiceStt({ audio: blob, filename: "audio.webm" });
          const t = String((data as any)?.transcript || "").trim();
          setTranscript(t);
          if (t) setPrompt(t);
        } catch (e: any) {
          setTranscript(`Voice error: ${String(e?.message || "unknown_error")}`);
        } finally {
          setVoiceBusy(false);
        }

        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
      };

      recorderRef.current = rec;
      rec.start();
    } catch (e: any) {
      setTranscript("");
      setError(String(e?.message || "mic_permission_denied"));
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
    recorderRef.current = null;
  }

  return (
    <Window id="tutor">
      <div className="h-full flex flex-col">
        <div className="px-5 py-4 border-b border-border bg-background/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-md border border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">AI Tutor</div>
                <div className="text-sm text-foreground">Production-grade explanations + examples</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadChatPdf}
                disabled={!msgs.length}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-60"
                title="Download chat as PDF"
              >
                <Download className="h-4 w-4" />
                <span className="font-mono text-xs uppercase tracking-widest">Download PDF</span>
              </button>
              <button
                type="button"
                onClick={speakLastAnswer}
                disabled={voiceBusy || msgs.length === 0}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-60"
                title="Speak last answer"
              >
                <Volume2 className="h-4 w-4" />
                <span className="font-mono text-xs uppercase tracking-widest">Speak</span>
              </button>
              <button
                type="button"
                onClick={() => setMsgs([])}
                disabled={busy || voiceBusy}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-60"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
                <span className="font-mono text-xs uppercase tracking-widest">Clear</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2">
          <div className="border-r border-border bg-background/30 p-5 overflow-auto">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick prompts</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Explain this like I'm 12",
                "Give me step-by-step",
                "Give 3 examples",
                "Common mistakes",
                "Give a short summary + then deep explanation",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt((p) => (p ? `${p}\n\n${s}` : s))}
                  className="px-2 py-1 rounded-md border border-border bg-surface/60 text-xs text-foreground/85 hover:border-primary/60 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Voice</div>
            <div className="mt-3 flex items-center gap-2">
              {recorderRef.current ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive/60 transition-colors"
                >
                  <MicOff className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-widest">Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={voiceBusy}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-60"
                >
                  <Mic className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-widest">Record</span>
                </button>
              )}
              {voiceBusy ? (
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing...
                </div>
              ) : null}
            </div>
            {transcript ? (
              <div className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap">{transcript}</div>
            ) : null}

            {error ? (
              <div className="mt-6 border border-destructive/40 bg-destructive/10 text-destructive p-3 text-xs font-mono">
                {error}
              </div>
            ) : null}
          </div>

          <div className="bg-background/20 p-5 overflow-hidden flex flex-col">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Chat</div>

            <div className="mt-3 flex-1 overflow-auto border border-border bg-surface/60 rounded-md p-3 space-y-2">
              {msgs.length === 0 ? (
                <div className="text-sm text-muted-foreground">Ask a question to start.</div>
              ) : (
                msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "text-foreground" : "text-foreground/90"}`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">
                      {m.role === "user" ? "YOU" : "TUTOR"}
                    </span>
                    {m.text}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="flex-1 resize-none rounded-md border border-border bg-surface/60 p-3 text-sm outline-none focus:border-primary/60"
                placeholder="Ask the tutor..."
              />
              <button
                type="button"
                onClick={() => void ask()}
                disabled={busy}
                className={`h-[84px] px-4 rounded-md border font-mono text-xs uppercase tracking-widest transition-colors ${
                  busy
                    ? "border-border bg-surface text-muted-foreground"
                    : "border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Thinking" : "Ask"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}
