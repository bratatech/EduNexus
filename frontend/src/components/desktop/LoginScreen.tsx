import { useState, useEffect, useRef } from "react";
import { api, setToken } from "@/lib/api";

const DEDSEC_ART = `
    ██████╗ ███████╗██████╗ ███████╗███████╗ ██████╗
    ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝
    ██║  ██║█████╗  ██║  ██║███████╗█████╗  ██║     
    ██║  ██║██╔══╝  ██║  ██║╚════██║██╔══╝  ██║     
    ██████╔╝███████╗██████╔╝███████║███████╗╚██████╗
    ╚═════╝ ╚══════╝╚═════╝ ╚══════╝╚══════╝ ╚═════╝
`;

const SKULL = `
       ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    ▄█▀              ▀█▄
   █▀    ▄▄      ▄▄    ▀█
  █     █░░█    █░░█     █
  █      ▀▀      ▀▀      █
  █    ▄              ▄   █
   █    ▀▀▀▀▀▀▀▀▀▀▀▀    █
    ▀█▄    ▀▀▀▀▀▀▀    ▄█▀
       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
`;

interface LoginScreenProps {
  onLogin: (user: { username: string; email?: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; life: number }>>([]);
  const [scanY, setScanY] = useState(0);
  const [typedText, setTypedText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const ivRef = useRef<number | null>(null);

  const TAGLINE = "// EDUNEXUZ CTOS NETWORK — SECURE ACCESS POINT";

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      if (i <= TAGLINE.length) {
        setTypedText(TAGLINE.slice(0, i));
        i++;
      } else {
        clearInterval(iv);
      }
    }, 40);
    return () => clearInterval(iv);
  }, []);

  // Glitch effect
  useEffect(() => {
    const iv = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150 + Math.random() * 200);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, []);

  // Scanline animation
  useEffect(() => {
    const iv = setInterval(() => {
      setScanY((y) => (y + 0.5) % 110);
    }, 30);
    return () => clearInterval(iv);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pts: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];
    for (let i = 0; i < 80; i++) {
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connecting lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(240, 163, 90, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = `rgba(240, 163, 90, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setProgress(0);

    if (ivRef.current) window.clearInterval(ivRef.current);

    let done = false;
    ivRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (done) return 100;
        const next = p + Math.random() * 15 + 5;
        return Math.min(next, 92);
      });
    }, 80);

    try {
      const wallet = username.trim();
      const pwd = password;

      const result =
        mode === "signup"
          ? await api.register({ wallet, name: wallet, email: email.trim() || undefined, password: pwd })
          : await api.login({ wallet, password: pwd });

      const token = result?.token as string | undefined;
      if (token) setToken(token);

      const safeUser = result?.user;
      const userData = { username: safeUser?.wallet || wallet, email: safeUser?.email || (email.trim() || undefined) };
      try {
        localStorage.setItem("edunexuz-user", JSON.stringify(userData));
      } catch {}

      done = true;
      setProgress(100);
      if (ivRef.current) window.clearInterval(ivRef.current);
      ivRef.current = null;

      setTimeout(() => onLogin(userData), 250);
    } catch (err: any) {
      done = true;
      if (ivRef.current) window.clearInterval(ivRef.current);
      ivRef.current = null;
      setLoading(false);
      setProgress(0);
      alert(`Authentication failed: ${err?.message || "unknown_error"}`);
    }
  }

  useEffect(() => {
    return () => {
      if (ivRef.current) window.clearInterval(ivRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden" style={{ background: "#0a0c10" }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Hex grid overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240,163,90,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,163,90,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Scanline */}
      <div
        className="absolute left-0 right-0 h-[2px] z-[2] pointer-events-none"
        style={{
          top: `${scanY}%`,
          background: "linear-gradient(90deg, transparent, rgba(240,163,90,0.15), transparent)",
        }}
      />

      {/* CRT vignette */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Noise overlay */}
      <div
        className="absolute inset-0 z-[4] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* DedSec skull */}
        <div className="mb-2 opacity-20">
          <pre className="text-[8px] sm:text-[10px] text-amber-400 font-mono leading-none text-center select-none">
            {SKULL}
          </pre>
        </div>

        {/* Glitch title */}
        <div className="relative mb-1">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-mono font-bold tracking-[0.2em] text-center select-none"
            style={{
              color: "#f0a35a",
              textShadow: glitchActive
                ? `
                  -3px 0 #ff006a, 3px 0 #00d4ff,
                  -3px -3px #ff006a, 3px 3px #00d4ff,
                  6px 0 rgba(240,163,90,0.3), -6px 0 rgba(240,163,90,0.3)
                `
                : "0 0 20px rgba(240,163,90,0.4), 0 0 60px rgba(240,163,90,0.15)",
              transform: glitchActive ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 2 - 1}px)` : "none",
            }}
          >
            EDUNEXUZ
          </h1>
          {glitchActive && (
            <>
              <h1
                className="absolute inset-0 text-4xl sm:text-6xl md:text-7xl font-mono font-bold tracking-[0.2em] text-center select-none"
                style={{
                  color: "#ff006a",
                  clipPath: `inset(${Math.random() * 40}% 0 ${Math.random() * 40}% 0)`,
                  transform: `translate(${Math.random() * 8 - 4}px, 0)`,
                  opacity: 0.7,
                }}
              >
                EDUNEXUZ
              </h1>
              <h1
                className="absolute inset-0 text-4xl sm:text-6xl md:text-7xl font-mono font-bold tracking-[0.2em] text-center select-none"
                style={{
                  color: "#00d4ff",
                  clipPath: `inset(${Math.random() * 40 + 30}% 0 ${Math.random() * 30}% 0)`,
                  transform: `translate(${Math.random() * -8 + 4}px, 0)`,
                  opacity: 0.7,
                }}
              >
                EDUNEXUZ
              </h1>
            </>
          )}
        </div>

        {/* Tagline typewriter */}
        <div className="mb-8 font-mono text-xs sm:text-sm tracking-[0.3em] text-center" style={{ color: "rgba(240,163,90,0.5)" }}>
          {typedText}
          <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ background: "rgba(240,163,90,0.7)" }} />
        </div>

        {/* Login/Signup card */}
        <div
          className="w-full max-w-md p-6 sm:p-8"
          style={{
            background: "rgba(20, 24, 32, 0.85)",
            border: "1px solid rgba(240,163,90,0.2)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 60px rgba(240,163,90,0.08), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(240,163,90,0.1)",
          }}
        >
          {/* Mode toggle */}
          <div className="flex mb-6 border-b" style={{ borderColor: "rgba(240,163,90,0.15)" }}>
            <button
              onClick={() => setMode("login")}
              className="flex-1 py-3 font-mono text-xs uppercase tracking-[0.3em] transition-all relative"
              style={{
                color: mode === "login" ? "#f0a35a" : "rgba(240,163,90,0.3)",
                textShadow: mode === "login" ? "0 0 10px rgba(240,163,90,0.5)" : "none",
              }}
            >
              ▸ Login
              {mode === "login" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "#f0a35a", boxShadow: "0 0 10px rgba(240,163,90,0.5)" }} />
              )}
            </button>
            <button
              onClick={() => setMode("signup")}
              className="flex-1 py-3 font-mono text-xs uppercase tracking-[0.3em] transition-all relative"
              style={{
                color: mode === "signup" ? "#f0a35a" : "rgba(240,163,90,0.3)",
                textShadow: mode === "signup" ? "0 0 10px rgba(240,163,90,0.5)" : "none",
              }}
            >
              ▸ Become a Member
              {mode === "signup" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "#f0a35a", boxShadow: "0 0 10px rgba(240,163,90,0.5)" }} />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(240,163,90,0.5)" }}>
                Operator ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your handle..."
                required
                className="w-full px-4 py-3 font-mono text-sm outline-none transition-all"
                style={{
                  background: "rgba(240,163,90,0.05)",
                  border: "1px solid rgba(240,163,90,0.15)",
                  color: "#e8d5c0",
                  caretColor: "#f0a35a",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(240,163,90,0.4)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(240,163,90,0.15)"}
              />
            </div>

            {/* Email (signup only) */}
            {mode === "signup" && (
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(240,163,90,0.5)" }}>
                  Secure Channel (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 font-mono text-sm outline-none transition-all"
                  style={{
                    background: "rgba(240,163,90,0.05)",
                    border: "1px solid rgba(240,163,90,0.15)",
                    color: "#e8d5c0",
                    caretColor: "#f0a35a",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(240,163,90,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(240,163,90,0.15)"}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(240,163,90,0.5)" }}>
                Access Key
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-4 py-3 font-mono text-sm outline-none transition-all"
                style={{
                  background: "rgba(240,163,90,0.05)",
                  border: "1px solid rgba(240,163,90,0.15)",
                  color: "#e8d5c0",
                  caretColor: "#f0a35a",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(240,163,90,0.4)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(240,163,90,0.15)"}
              />
            </div>

            {/* Submit */}
            {!loading ? (
              <button
                type="submit"
                className="w-full py-3 font-mono text-sm uppercase tracking-[0.3em] transition-all"
                style={{
                  background: "rgba(240,163,90,0.15)",
                  border: "1px solid rgba(240,163,90,0.3)",
                  color: "#f0a35a",
                  textShadow: "0 0 10px rgba(240,163,90,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(240,163,90,0.25)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(240,163,90,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(240,163,90,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                ▸ {mode === "login" ? "Access Network" : "Initialize Profile"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(240,163,90,0.6)" }}>
                  {progress < 30 ? "[ ESTABLISHING SECURE CHANNEL... ]" :
                   progress < 60 ? "[ AUTHENTICATING OPERATOR... ]" :
                   progress < 90 ? "[ LOADING ctOS PROFILE... ]" :
                   "[ ACCESS GRANTED ]"}
                </div>
                <div className="w-full h-1 overflow-hidden" style={{ background: "rgba(240,163,90,0.1)" }}>
                  <div
                    className="h-full transition-all duration-75"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      background: "#f0a35a",
                      boxShadow: "0 0 10px rgba(240,163,90,0.5)",
                    }}
                  />
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 text-center" style={{ borderTop: "1px solid rgba(240,163,90,0.08)" }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(240,163,90,0.25)" }}>
              ctOS v3.14 // EduNexuZ Secure Network // {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* DedSec ASCII art (subtle) */}
        <div className="mt-6 opacity-[0.06]">
          <pre className="text-[6px] sm:text-[8px] font-mono leading-none text-center select-none" style={{ color: "#f0a35a" }}>
            {DEDSEC_ART}
          </pre>
        </div>
      </div>
    </div>
  );
}
