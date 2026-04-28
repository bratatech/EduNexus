import { useEffect, useState } from "react";
import { Wifi, Volume2, BatteryFull, Power } from "lucide-react";

export function TopBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="relative z-50 flex h-8 items-center justify-between px-3 bg-surface-2/90 backdrop-blur border-b border-border font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-primary text-glow">
          <span className="grid place-items-center h-4 w-4 border border-primary/60 rotate-45">
            <span className="h-1 w-1 bg-primary -rotate-45" />
          </span>
          EduNexuZ
          <span className="text-muted-foreground/70">// ctOS</span>
        </span>
        <span className="hidden sm:inline hover:text-foreground cursor-default">File</span>
        <span className="hidden sm:inline hover:text-foreground cursor-default">View</span>
        <span className="hidden sm:inline hover:text-foreground cursor-default">Network</span>
        <span className="hidden md:inline hover:text-foreground cursor-default">Help</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:flex items-center gap-1 text-cyan-signal">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-signal animate-flicker" />
          NETWORK ONLINE
        </span>
        <Wifi className="h-3.5 w-3.5" />
        <Volume2 className="h-3.5 w-3.5" />
        <BatteryFull className="h-3.5 w-3.5" />
        <span className="text-foreground tabular-nums">{date}</span>
        <span className="text-primary tabular-nums">{time}</span>
        <button
          type="button"
          className="grid place-items-center"
          onClick={() => {
            window.dispatchEvent(new Event("edunexuz-logout"));
          }}
        >
          <Power className="h-3.5 w-3.5 text-destructive/70" />
        </button>
      </div>
    </div>
  );
}
