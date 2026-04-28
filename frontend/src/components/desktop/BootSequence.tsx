import { useEffect, useState } from "react";

const BOOT_LINES = [
  "GRUB loading...",
  "Booting 'EduNexuZ ctOS v3.14'...",
  "",
  "[ ctOS ] initializing kernel modules...",
  "[ OK ] Started systemd-journald.service",
  "[ OK ] Reached target Local File Systems",
  "[ OK ] mounting /dev/sda1 → /edunexuz",
  "[ OK ] Started Network Manager",
  "[ OK ] loading desktop environment...",
  "[ OK ] mounting /programs",
  "[ OK ] mounting /instructors",
  "[ OK ] mounting /courses",
  "[ OK ] initializing 3D classroom engine",
  "[ OK ] establishing secure channel",
  "[ OK ] community websocket connected",
  "[ OK ] profile data loaded",
  "[ OK ] handshake complete — welcome, operator",
  "",
  "EDUNEXUZ ctOS NETWORK — CONNECTED",
];

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"grub" | "boot" | "splash">("grub");
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);

  // GRUB phase (brief)
  useEffect(() => {
    if (phase === "grub") {
      const t = setTimeout(() => setPhase("boot"), 800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Boot messages
  useEffect(() => {
    if (phase !== "boot") return;
    if (shown >= BOOT_LINES.length) {
      const t = setTimeout(() => setPhase("splash"), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 200 : 80 + Math.random() * 60);
    return () => clearTimeout(t);
  }, [phase, shown]);

  // Splash / progress
  useEffect(() => {
    if (phase !== "splash") return;
    if (progress >= 100) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => Math.min(100, p + Math.random() * 20 + 8)), 60);
    return () => clearTimeout(t);
  }, [phase, progress, onDone]);

  // GRUB screen
  if (phase === "grub") {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono">
        <div className="text-gray-400 text-xs mb-4">GNU GRUB version 2.12</div>
        <div className="w-[min(500px,90vw)] border border-gray-600 rounded">
          <div className="px-4 py-2 bg-gray-800 text-white text-sm border-b border-gray-600">
            ▸ EduNexuZ ctOS v3.14 (default)
          </div>
          <div className="px-4 py-2 text-gray-500 text-sm">
            &nbsp;&nbsp;EduNexuZ Recovery Mode
          </div>
          <div className="px-4 py-2 text-gray-500 text-sm">
            &nbsp;&nbsp;Memory Diagnostics
          </div>
        </div>
        <div className="mt-4 text-gray-600 text-[10px]">
          Use ↑ and ↓ to select • Enter to boot
        </div>
      </div>
    );
  }

  // Boot messages
  if (phase === "boot") {
    return (
      <div className="fixed inset-0 z-[100] bg-black p-6 font-mono text-sm overflow-hidden">
        <pre className="text-green-400/90 leading-relaxed">
          {BOOT_LINES.slice(0, shown).map((l, i) => {
            if (l.startsWith("[ OK ]")) {
              return (
                <div key={i}>
                  <span className="text-green-500">[  OK  ]</span>
                  <span className="text-gray-300">{l.slice(6)}</span>
                </div>
              );
            }
            if (l.startsWith("GRUB") || l.startsWith("Booting")) {
              return <div key={i} className="text-white">{l}</div>;
            }
            if (l.startsWith("EDUNEXUZ")) {
              return <div key={i} className="text-amber-400 mt-2 font-bold">{l}</div>;
            }
            if (l.startsWith("[ ctOS ]")) {
              return <div key={i} className="text-cyan-400">{l}</div>;
            }
            return <div key={i}>{l || "\u00a0"}</div>;
          })}
          {shown < BOOT_LINES.length && (
            <span className="inline-block w-2 h-4 bg-green-400 align-middle animate-pulse" />
          )}
        </pre>
      </div>
    );
  }

  // Splash screen with progress
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="grid place-items-center h-12 w-12 border-2 border-amber-400/60 rotate-45">
            <div className="h-3 w-3 bg-amber-400 -rotate-45" />
          </div>
        </div>
        <h1
          className="text-3xl font-mono font-bold tracking-[0.3em]"
          style={{ color: "#f0a35a", textShadow: "0 0 30px rgba(240,163,90,0.3)" }}
        >
          EDUNEXUZ
        </h1>
        <div className="text-[10px] uppercase tracking-[0.5em] mt-2" style={{ color: "rgba(240,163,90,0.4)" }}>
          ctOS // DESKTOP ENVIRONMENT
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-64">
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(240,163,90,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: "#f0a35a",
              boxShadow: "0 0 10px rgba(240,163,90,0.5)",
            }}
          />
        </div>
        <div className="text-center mt-3 text-[10px] font-mono" style={{ color: "rgba(240,163,90,0.4)" }}>
          {progress < 100 ? "Loading desktop..." : "Welcome, operator"}
        </div>
      </div>
    </div>
  );
}
