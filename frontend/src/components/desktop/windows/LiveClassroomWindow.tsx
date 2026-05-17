import { useState, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Window } from "../Window";
import { useWindowManager } from "@/lib/window-manager";
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Monitor, LogOut, RotateCcw, Users } from "lucide-react";

import { Floor, Walls, ClassroomLights, Bench, TeacherDesk, DustParticles } from "./classroom/ClassroomEnvironment";
import {
  STUDENTS,
  StudentCharacter,
  CameraAnimation,
  Smartboard,
  CelebrationParticles,
} from "./classroom/ClassroomInteractives";

// Chat message type
interface ChatMsg {
  id: number;
  user: string;
  text: string;
  time: string;
}

export function LiveClassroomWindow() {
  const { close } = useWindowManager();

  // Attendance state
  const [presentIds, setPresentIds] = useState<Set<number>>(new Set());
  const allPresent = presentIds.size === STUDENTS.length;

  const markPresent = useCallback((id: number) => {
    setPresentIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const resetAttendance = useCallback(() => {
    setPresentIds(new Set());
  }, []);

  // Controls state
  const [muted, setMuted] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, user: "Alex Chen", text: "Welcome to today's session!", time: "10:00" },
    { id: 2, user: "System", text: `${STUDENTS.length} students in classroom`, time: "10:01" },
    { id: 3, user: "Jordan", text: "Excited to learn about smart contracts!", time: "10:02" },
  ]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        user: "You",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  };

  return (
    <Window id="classroom">
      <div className="flex h-full" style={{ background: "#0a0a0f" }}>
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0f" }}>
                <div className="text-center">
                  <div className="text-5xl mb-4 animate-pulse">🎓</div>
                  <div className="text-amber-400 font-mono text-sm">Loading 3D Classroom...</div>
                  <div className="mt-3 w-40 h-1.5 rounded-full overflow-hidden mx-auto" style={{ background: "#222" }}>
                    <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
                  <div className="text-gray-600 font-mono text-[10px] mt-2">Initializing Three.js scene</div>
                </div>
              </div>
            }
          >
            <Canvas
              shadows
              camera={{ position: [0, 15, 25], fov: 50 }}
              style={{ background: "#0a0a0f" }}
            >
              <CameraAnimation />
              <ClassroomLights />
              <Floor />
              <Walls />
              <Smartboard />
              <TeacherDesk />

              {/* Benches */}
              {STUDENTS.map((s) => (
                <Bench key={`bench-${s.id}`} position={s.benchPos} />
              ))}

              {/* Students */}
              {STUDENTS.map((s) => (
                <StudentCharacter
                  key={s.id}
                  student={s}
                  isPresent={presentIds.has(s.id)}
                  onMark={markPresent}
                />
              ))}

              <DustParticles />
              <CelebrationParticles active={allPresent} />

              <OrbitControls
                makeDefault
                minDistance={4}
                maxDistance={20}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI / 2 - 0.05}
                target={[0, 3, -2]}
              />
            </Canvas>
          </Suspense>

          {/* LIVE badge */}
          <div
            className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-mono uppercase tracking-wider">Live</span>
            <span className="text-gray-500 text-xs">• {STUDENTS.length} students</span>
          </div>

          {/* Attendance HUD */}
          <div
            className="absolute top-3 right-3 flex items-center gap-3 px-4 py-2 rounded-lg"
            style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${allPresent ? "rgba(74,222,128,0.4)" : "rgba(240,163,90,0.2)"}` }}
          >
            <Users className="h-4 w-4 text-amber-400" />
            <div className="font-mono text-xs">
              <span className={allPresent ? "text-green-400" : "text-amber-400"}>
                {presentIds.size}/{STUDENTS.length}
              </span>
              <span className="text-gray-500 ml-1.5">attendance</span>
            </div>
            {/* Progress bar */}
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(presentIds.size / STUDENTS.length) * 100}%`,
                  background: allPresent
                    ? "linear-gradient(90deg, #4ade80, #22c55e)"
                    : "linear-gradient(90deg, #f0a35a, #f59e0b)",
                }}
              />
            </div>
            <button
              onClick={resetAttendance}
              title="Reset attendance"
              className="grid place-items-center h-6 w-6 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* All present banner */}
          {allPresent && (
            <div
              className="absolute top-14 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-lg font-mono text-sm animate-bounce"
              style={{
                background: "linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.15))",
                border: "1px solid rgba(74,222,128,0.4)",
                color: "#4ade80",
                textShadow: "0 0 12px rgba(74,222,128,0.4)",
              }}
            >
              🎉 All Present! Full Attendance Achieved!
            </div>
          )}

          {/* Instruction hint */}
          {presentIds.size === 0 && (
            <div
              className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg font-mono text-[11px] text-gray-400"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              💡 Click on each student to mark attendance
            </div>
          )}

          {/* Controls bar */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <button
              onClick={() => setMuted(!muted)}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                muted
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/10 text-white border border-white/20"
              }`}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setVideoOn(!videoOn)}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                !videoOn
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/10 text-white border border-white/20"
              }`}
            >
              {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setHandRaised(!handRaised)}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                handRaised
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/10 text-white border border-white/20"
              }`}
            >
              <Hand className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                chatOpen
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/10 text-white border border-white/20"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button className="grid place-items-center h-10 w-10 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all">
              <Monitor className="h-4 w-4" />
            </button>
            {/* Leave Classroom — closes window */}
            <button
              onClick={() => close("classroom")}
              title="Leave Classroom"
              className="grid place-items-center h-10 w-10 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div
            className="w-72 flex flex-col border-l"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,20,0.95)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-white text-sm font-medium">Chat</h3>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-xs font-medium ${
                        msg.user === "You"
                          ? "text-amber-400"
                          : msg.user === "System"
                            ? "text-cyan-400"
                            : "text-gray-300"
                      }`}
                    >
                      {msg.user}
                    </span>
                    <span className="text-[10px] text-gray-600">{msg.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-xs rounded-md outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#e8d5c0",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-md text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Window>
  );
}
