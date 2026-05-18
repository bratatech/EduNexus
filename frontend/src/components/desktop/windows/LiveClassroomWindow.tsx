import { useEffect, useMemo, useState, useRef, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import { Window } from "../Window";
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Monitor, LogOut } from "lucide-react";
import * as THREE from "three";
import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api";

// 3D Classroom Scene Components

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[20, 16]} />
      <meshStandardMaterial color="#2a2520" roughness={0.8} />
    </mesh>
  );
}

function Walls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 4, -8]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#1e1a16" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-10, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#221e1a" />
      </mesh>
      {/* Right wall */}
      <mesh position={[10, 4, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#221e1a" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#181614" />
      </mesh>
    </group>
  );
}

function Whiteboard() {
  return (
    <group position={[0, 4.5, -7.9]}>
      {/* Board frame */}
      <mesh>
        <boxGeometry args={[10, 4.5, 0.1]} />
        <meshStandardMaterial color="#3a3530" />
      </mesh>
      {/* Board surface */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[9.6, 4.1]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.3} />
      </mesh>
      {/* Text on whiteboard */}
      <Text
        position={[-3.5, 1.2, 0.12]}
        fontSize={0.35}
        color="#e8d5c0"
        anchorX="left"
      >
        EduNexuZ — Live Session
      </Text>
      <Text
        position={[-3.5, 0.5, 0.12]}
        fontSize={0.25}
        color="#f0a35a"
        anchorX="left"
      >
        Topic: Introduction to Web3
      </Text>
      <Text
        position={[-3.5, -0.1, 0.12]}
        fontSize={0.2}
        color="#88a088"
        anchorX="left"
      >
        {`• Blockchain fundamentals
• Smart contracts overview  
• DeFi protocols`}
      </Text>
    </group>
  );
}

function Desk({ position, color = "#4a3a2a" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* Desktop surface */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.4, 0.06, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Legs */}
      {[[-0.6, 0, -0.3], [0.6, 0, -0.3], [-0.6, 0, 0.3], [0.6, 0, 0.3]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.375, pos[2]]} castShadow>
          <boxGeometry args={[0.05, 0.75, 0.05]} />
          <meshStandardMaterial color="#2a2520" />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <meshStandardMaterial color="#333028" />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.8, -0.22]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.04]} />
        <meshStandardMaterial color="#333028" />
      </mesh>
      {/* Legs */}
      {[[-0.2, 0, -0.2], [0.2, 0, -0.2], [-0.2, 0, 0.2], [0.2, 0, 0.2]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.225, pos[2]]}>
          <boxGeometry args={[0.03, 0.45, 0.03]} />
          <meshStandardMaterial color="#1a1816" />
        </mesh>
      ))}
    </group>
  );
}

function StudentAvatar({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (ref.current) {
      // Subtle idle animation
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.05;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[2]) * 0.01;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.35, 0.5, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function TeacherDesk() {
  return (
    <group position={[0, 0, -6]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[3, 0.08, 1]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.5} />
      </mesh>
      {[[-1.3, 0, -0.4], [1.3, 0, -0.4], [-1.3, 0, 0.4], [1.3, 0, 0.4]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.425, pos[2]]}>
          <boxGeometry args={[0.06, 0.85, 0.06]} />
          <meshStandardMaterial color="#3a3020" />
        </mesh>
      ))}
      {/* Monitor on desk */}
      <mesh position={[0, 1.3, -0.2]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 1.3, -0.19]}>
        <planeGeometry args={[0.75, 0.45]} />
        <meshStandardMaterial color="#1a2a3a" emissive="#1a2a3a" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function DustParticles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 200;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = Math.random() * 7 + 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
      const arr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.001;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#f0a35a" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function ClassroomScene() {
  const STUDENT_COLORS = ["#c07040", "#907050", "#b08060", "#a06848", "#8a6050", "#c88060"];
  const deskPositions: [number, number, number][] = [
    [-4, 0, -2], [-1.5, 0, -2], [1.5, 0, -2], [4, 0, -2],
    [-4, 0, 1], [-1.5, 0, 1], [1.5, 0, 1], [4, 0, 1],
    [-4, 0, 4], [-1.5, 0, 4], [1.5, 0, 4], [4, 0, 4],
  ];

  return (
    <>
      <ambientLight intensity={0.3} color="#f0d0a0" />
      <directionalLight position={[5, 8, 3]} intensity={0.6} color="#ffe8c0" castShadow />
      <pointLight position={[0, 7, -6]} intensity={0.8} color="#f0a35a" distance={15} />
      <pointLight position={[-8, 5, 0]} intensity={0.3} color="#a0c0f0" distance={12} />
      <pointLight position={[8, 5, 0]} intensity={0.3} color="#a0c0f0" distance={12} />

      <Floor />
      <Walls />
      <Whiteboard />
      <TeacherDesk />

      {deskPositions.map((pos, i) => (
        <group key={i}>
          <Desk position={pos} />
          <Chair position={[pos[0], 0, pos[2] + 0.7]} />
          {i < 8 && (
            <StudentAvatar
              position={[pos[0], 0, pos[2] + 0.5]}
              color={STUDENT_COLORS[i % STUDENT_COLORS.length]}
            />
          )}
        </group>
      ))}

      <DustParticles />
      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={18}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 3, -2]}
      />
    </>
  );
}

// Chat message component
interface ChatMsg {
  id: number;
  user: string;
  text: string;
  time: string;
}

// ── Error boundary so a Three.js crash shows a friendly message ──────────
interface EBState { hasError: boolean; msg: string }
class CanvasErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, msg: "" };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, msg: err?.message || "render_error" };
  }
  componentDidCatch(_err: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0f" }}>
          <div className="text-center px-6">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-amber-400 font-mono text-sm mb-1">3D scene failed to render</div>
            <div className="text-gray-500 font-mono text-xs">{this.state.msg}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
// ──────────────────────────────────────────────────────────────────────────

export function LiveClassroomWindow() {
  const [muted, setMuted] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [participants, setParticipants] = useState<number>(0);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string>("");
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingIceRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const ROOM_ID = "classroom-web3";

  const [iceServers, setIceServers] = useState<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  const [socketPath, setSocketPath] = useState<string>("/socket.io");
  const iceServersRef = useRef<RTCIceServer[]>(iceServers);
  const socketPathRef = useRef<string>(socketPath);
  const [realtimeReady, setRealtimeReady] = useState(false);

  useEffect(() => {
    iceServersRef.current = iceServers;
  }, [iceServers]);

  useEffect(() => {
    socketPathRef.current = socketPath;
  }, [socketPath]);

  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStreamReady(true);
      setLocalPreviewStream(new MediaStream(stream.getVideoTracks()));

      stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
      stream.getVideoTracks().forEach((t) => (t.enabled = videoOn));

      return stream;
    } catch (e: any) {
      setLocalError(e?.message || "media_permission_denied");
      throw e;
    }
  }

  function getOrCreatePc(peerId: string) {
    const existing = pcsRef.current[peerId];
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pcsRef.current[peerId] = pc;

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      socketRef.current?.emit("webrtc:signal", {
        roomId: ROOM_ID,
        to: peerId,
        data: { type: "ice", candidate: ev.candidate.toJSON() },
      });
    };

    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (!stream) return;
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "failed" || st === "closed" || st === "disconnected") {
        setRemoteStreams((prev) => {
          const { [peerId]: _, ...rest } = prev;
          return rest;
        });
      }
    };

    return pc;
  }

  async function flushPendingIce(peerId: string) {
    const pc = pcsRef.current[peerId];
    if (!pc) return;
    const list = pendingIceRef.current[peerId] || [];
    if (!list.length) return;
    for (const c of list) {
      try {
        await pc.addIceCandidate(c);
      } catch {}
    }
    pendingIceRef.current[peerId] = [];
  }

  async function makeOffer(peerId: string) {
    const pc = getOrCreatePc(peerId);
    const stream = await ensureLocalStream();
    for (const track of stream.getTracks()) {
      const senders = pc.getSenders();
      if (senders.some((s) => s.track?.kind === track.kind)) continue;
      pc.addTrack(track, stream);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit("webrtc:signal", {
      roomId: ROOM_ID,
      to: peerId,
      data: { type: "offer", sdp: offer.sdp },
    });
  }

  useEffect(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
    let token = "";
    try {
      token = localStorage.getItem("edunexuz-token") || "";
    } catch {}

    let mounted = true;
    let s: Socket | null = null;

    const cleanup = () => {
      mounted = false;
      try {
        s?.emit("room:leave", { roomId: ROOM_ID });
        s?.disconnect();
      } catch {}
      socketRef.current = null;

      Object.values(pcsRef.current).forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      pcsRef.current = {};
      pendingIceRef.current = {};

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };

    (async () => {
      let cfg: any = null;
      try {
        cfg = await api.realtimeConfig();
        if (!mounted) return;
        if (cfg?.iceServers?.length) setIceServers(cfg.iceServers);
        if (cfg?.socketPath) setSocketPath(cfg.socketPath);

        s = io(base, {
          transports: ["websocket"],
          auth: token ? { token: `Bearer ${token}` } : {},
          path: cfg?.socketPath || "/socket.io",
        });
      } catch {
        if (!mounted) return;
        s = io(base, {
          transports: ["websocket"],
          auth: token ? { token: `Bearer ${token}` } : {},
          path: "/socket.io",
        });
      }

      if (!mounted) return;
      if (cfg?.iceServers?.length) iceServersRef.current = cfg.iceServers;
      if (cfg?.socketPath) socketPathRef.current = cfg.socketPath;
      setRealtimeReady(true);

      if (!mounted || !s) return;
      socketRef.current = s;

      const socket = s;

    let name = "guest";
    try {
      const u = localStorage.getItem("edunexuz-user");
      if (u) name = JSON.parse(u)?.username || "guest";
    } catch {}

    socket.emit("room:join", { roomId: ROOM_ID, name });

    socket.on("presence", (p: { roomId: string; members: Array<any> }) => {
      if (p.roomId !== ROOM_ID) return;
      setParticipants(Array.isArray(p.members) ? p.members.length : 0);

      const selfId = socket.id;
      const ids = (Array.isArray(p.members) ? p.members.map((m) => m.id).filter(Boolean) : []) as string[];
      setMemberIds(ids.filter((id) => id && id !== selfId));
    });

    socket.on("chat:history", (payload: { roomId: string; messages: ChatMsg[] }) => {
      if (payload.roomId !== ROOM_ID) return;
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    });

    socket.on("chat:message", (payload: { roomId: string; message: ChatMsg }) => {
      if (payload.roomId !== ROOM_ID) return;
      setMessages((prev) => [...prev, payload.message].slice(-200));
    });

    socket.on("webrtc:signal", async (payload: { from: string; data: any }) => {
      const from = payload.from;
      const data = payload.data;
      if (!from || !data) return;

      const pc = getOrCreatePc(from);

      if (data.type === "offer") {
        const stream = await ensureLocalStream();
        for (const track of stream.getTracks()) {
          const senders = pc.getSenders();
          if (senders.some((se) => se.track?.kind === track.kind)) continue;
          pc.addTrack(track, stream);
        }
        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        await flushPendingIce(from);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        socket.emit("webrtc:signal", { roomId: ROOM_ID, to: from, data: { type: "answer", sdp: ans.sdp } });
      } else if (data.type === "answer") {
        await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
        await flushPendingIce(from);
      } else if (data.type === "ice") {
        const cand = data.candidate as RTCIceCandidateInit;
        if (!pc.remoteDescription) {
          pendingIceRef.current[from] = [...(pendingIceRef.current[from] || []), cand];
        } else {
          try {
            await pc.addIceCandidate(cand);
          } catch {}
        }
      }
    });
    })();

    return cleanup;
  }, []);

  useEffect(() => {
    if (!realtimeReady) return;
    const selfId = socketRef.current?.id;
    if (!selfId) return;
    const peers = memberIds;
    peers.forEach((pid) => {
      if (!pcsRef.current[pid]) {
        getOrCreatePc(pid);
        if (String(selfId) > String(pid)) {
          makeOffer(pid).catch(() => {});
        }
      }
    });

    Object.keys(pcsRef.current).forEach((pid) => {
      if (!peers.includes(pid)) {
        try {
          pcsRef.current[pid]?.close();
        } catch {}
        delete pcsRef.current[pid];
        setRemoteStreams((prev) => {
          const { [pid]: _, ...rest } = prev;
          return rest;
        });
      }
    });
  }, [memberIds]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = videoOn));
  }, [videoOn]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("chat:send", {
      roomId: ROOM_ID,
      message: {
        user: "You",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
    setChatInput("");
  };

  async function toggleMic() {
    if (muted) {
      try {
        await ensureLocalStream();
        setMuted(false);
      } catch {}
    } else {
      setMuted(true);
    }
  }

  async function toggleVideo() {
    if (!videoOn) {
      try {
        await ensureLocalStream();
        setVideoOn(true);
      } catch {}
    } else {
      setVideoOn(false);
    }
  }

  async function askTutor() {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    setAiAnswer("");
    try {
      const r = await api.aiTutor(aiPrompt.trim());
      setAiAnswer(r.answer || "");
    } catch (e: any) {
      setAiAnswer(`AI error: ${e?.message || "unknown_error"}`);
    } finally {
      setAiBusy(false);
    }
  }

  async function speak(text: string) {
    if (!text.trim()) return;
    setVoiceBusy(true);
    try {
      const r = (await api.aiVoiceTts(text)) as any;
      const b64 = r?.audioBase64;
      const mime = r?.audioMime || "audio/mpeg";
      if (!b64) return;
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch {
    } finally {
      setVoiceBusy(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await ensureLocalStream();
      const audioOnly = new MediaStream(stream.getAudioTracks());
      const rec = new MediaRecorder(audioOnly, { mimeType: "audio/webm" });
      recordedChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        setVoiceBusy(true);
        try {
          const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
          let token = "";
          try { token = localStorage.getItem("edunexuz-token") || ""; } catch {}
          const resp = await fetch(`${base}/api/ai/voice/stt`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd,
          });
          const data = await resp.json();
          if (resp.ok && data?.transcript) setTranscript(data.transcript);
          else setTranscript(`Voice error: ${data?.error || resp.status}`);
        } catch (e: any) {
          setTranscript(`Voice error: ${e?.message || "unknown_error"}`);
        } finally {
          setVoiceBusy(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
    } catch (e: any) {
      setLocalError(e?.message || "recording_failed");
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {}
    recorderRef.current = null;
  }

  return (
    <Window id="classroom">
      <div className="flex h-full" style={{ background: "#0a0a0f" }}>
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <CanvasErrorBoundary>
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0f" }}>
                  <div className="text-center">
                    <div className="text-4xl mb-4 animate-pulse">🎓</div>
                    <div className="text-amber-400 font-mono text-sm">Loading 3D Classroom...</div>
                    <div
                      className="mt-2 w-32 h-1 rounded-full overflow-hidden mx-auto"
                      style={{ background: "#222" }}
                    >
                      <div className="h-full bg-amber-500 animate-pulse rounded-full" style={{ width: "60%" }} />
                    </div>
                  </div>
                </div>
              }
            >
              <Canvas
                shadows
                camera={{ position: [0, 6, 10], fov: 50 }}
                style={{ background: "#0a0a0f" }}
              >
                <ClassroomScene />
              </Canvas>
            </Suspense>
          </CanvasErrorBoundary>

          {/* Video overlay */}
          {(localPreviewStream || Object.keys(remoteStreams).length > 0) && (
            <div className="absolute top-12 right-3 z-20 w-[280px] max-w-[40vw]">
              <div
                className="rounded-lg p-2"
                style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-300 font-mono mb-2">media</div>
                <div className="grid grid-cols-2 gap-2">
                  {localPreviewStream && <VideoTile stream={localPreviewStream} label="you" muted />}
                  {Object.entries(remoteStreams)
                    .slice(0, 3)
                    .map(([peerId, stream]) => (
                      <VideoTile key={peerId} stream={stream} label={peerId.slice(0, 4)} />
                    ))}
                </div>
              </div>
            </div>
          )}

          {(localPreviewStream || Object.keys(remoteStreams).length > 0) && mediaOpen && (
            <div className="absolute bottom-20 left-4 right-4 z-20 max-w-[920px]">
              <div
                className="rounded-lg p-3"
                style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-300 font-mono mb-2">viewport media</div>
                <div className="grid grid-cols-3 gap-3">
                  {localPreviewStream && <VideoTile stream={localPreviewStream} label="you" muted large />}
                  {Object.entries(remoteStreams)
                    .slice(0, 5)
                    .map(([peerId, stream]) => (
                      <VideoTile key={peerId} stream={stream} label={peerId.slice(0, 8)} large />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Live badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-mono uppercase tracking-wider">Live</span>
            <span className="text-gray-500 text-xs">• {participants || 0} participants</span>
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              onClick={toggleMic}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                muted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white border border-white/20"
              }`}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                !videoOn ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white border border-white/20"
              }`}
            >
              {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setHandRaised(!handRaised)}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                handRaised ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/10 text-white border border-white/20"
              }`}
            >
              <Hand className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`grid place-items-center h-10 w-10 rounded-full transition-all ${
                chatOpen ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/10 text-white border border-white/20"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              className="grid place-items-center h-10 w-10 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20"
              onClick={() => setMediaOpen((v) => !v)}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              className="grid place-items-center h-10 w-10 rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                try {
                  localStorage.removeItem("edunexuz-token");
                  localStorage.removeItem("edunexuz-user");
                  localStorage.removeItem("edunexuz-profile");
                } catch {}
                try {
                  sessionStorage.removeItem("edunexuz-booted");
                } catch {}
                window.location.reload();
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-72 flex flex-col border-l" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,20,0.95)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-white text-sm font-medium">Chat</h3>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {localError && (
                <div className="text-[10px] text-red-400 font-mono">{localError}</div>
              )}

              {Object.keys(remoteStreams).length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {Object.entries(remoteStreams).map(([peerId, stream]) => (
                    <VideoTile key={peerId} stream={stream} label={peerId.slice(0, 4)} />
                  ))}
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${msg.user === "You" ? "text-amber-400" : msg.user === "System" ? "text-cyan-400" : "text-gray-300"}`}>
                      {msg.user}
                    </span>
                    <span className="text-[10px] text-gray-600">{msg.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{msg.text}</p>
                </div>
              ))}

              <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-mono mb-2">AI Tutor</div>
                <div className="flex gap-2">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ask the tutor..."
                    className="flex-1 px-3 py-2 text-xs rounded-md outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#e8d5c0", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <button
                    type="button"
                    onClick={askTutor}
                    disabled={aiBusy}
                    className="px-3 py-2 rounded-md text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-60"
                  >
                    {aiBusy ? "..." : "Ask"}
                  </button>
                </div>
                {aiAnswer && (
                  <div className="mt-2 text-xs text-gray-400 leading-relaxed">
                    {aiAnswer}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => speak(aiAnswer)}
                        disabled={voiceBusy}
                        className="px-2 py-1 rounded text-[10px] bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 disabled:opacity-60"
                      >
                        {voiceBusy ? "..." : "TTS"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 text-[10px] uppercase tracking-wider text-cyan-400 font-mono mb-2">Voice</div>
                <div className="flex items-center gap-2">
                  {recorderRef.current ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={voiceBusy}
                      className="px-3 py-1.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-60"
                    >
                      Record
                    </button>
                  )}
                  <span className="text-[10px] text-gray-500">{voiceBusy ? "processing..." : localStreamReady ? "ready" : ""}</span>
                </div>
                {transcript && (
                  <div className="mt-2 text-xs text-gray-400">{transcript}</div>
                )}
              </div>
            </div>
            <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-xs rounded-md outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#e8d5c0", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-md text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
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

function VideoTile({
  stream,
  label,
  muted,
  large,
}: {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  large?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative rounded-md overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={!!muted}
        className={large ? "w-full h-40 object-cover" : "w-full h-20 object-cover"}
      />
      <div className="absolute bottom-1 left-1 text-[9px] font-mono text-gray-200 bg-black/40 px-1.5 py-0.5 rounded">{label}</div>
    </div>
  );
}
