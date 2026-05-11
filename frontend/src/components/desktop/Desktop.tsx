import { useEffect, useState } from "react";
import { WindowManagerProvider, useWindowManager, type WindowId } from "@/lib/window-manager";
import { useTheme, type ThemeId, THEMES } from "@/lib/theme-provider";
import { TopBar } from "./TopBar";
import { DesktopIcons } from "./DesktopIcons";
import { Dock } from "./Dock";
import { BootSequence } from "./BootSequence";
import { LoginScreen } from "./LoginScreen";
import { ReadmeWindow } from "./windows/ReadmeWindow";
import { ProgramsWindow } from "./windows/ProgramsWindow";
import { InstructorsWindow } from "./windows/InstructorsWindow";
import { EnrollWindow } from "./windows/EnrollWindow";
import { FirefoxWindow } from "./windows/FirefoxWindow";
import { VSCodeWindow } from "./windows/VSCodeWindow";
import { TerminalWindow } from "./windows/TerminalWindow";
import { SettingsWindow } from "./windows/SettingsWindow";
import { CoursesWindow } from "./windows/CoursesWindow";
import { LiveClassroomWindow } from "./windows/LiveClassroomWindow";
import { CommunityWindow } from "./windows/CommunityWindow";
import { ProfileWindow } from "./windows/ProfileWindow";
import { DocumentSummarizerWindow } from "./windows/DocumentSummarizerWindow";
import { AITutorWindow } from "./windows/AITutorWindow";
import { Toaster } from "@/components/ui/sonner";
import { api, setToken } from "@/lib/api";

function MobileFallback() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .getContent("mobile_programs")
      .then((r) => {
        if (!mounted) return;
        setItems((r?.data || []) as string[]);
      })
      .catch(() => {
        if (!mounted) return;
        setItems([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="md:hidden min-h-screen overflow-y-auto bg-background hex-grid">
      <div className="px-5 py-6 space-y-8">
        <header className="font-mono">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary text-glow">// warm tutoring network</div>
          <h1 className="text-3xl text-foreground mt-1">EduNexuZ</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Tutoring for the connected generation. Math, sciences, languages, CS and test prep — paired with
            vetted tutors in 24h.
          </p>
        </header>
        <a href="#enroll" className="block text-center py-3 bg-primary text-primary-foreground font-mono uppercase tracking-widest text-sm">▸ Enroll now</a>
        <Section title="Programs">
          <ul className="font-mono text-sm space-y-1.5">
            {items.map((t) => (
              <li key={t} className="text-foreground/85">› {t}</li>
            ))}
          </ul>
        </Section>
        <Section title="How it works">
          <ol className="space-y-2 font-mono text-sm text-foreground/85">
            <li><span className="text-primary">01</span> — Free 20-min diagnostic call</li>
            <li><span className="text-primary">02</span> — Matched with a tutor in 24h</li>
            <li><span className="text-primary">03</span> — Weekly sessions + progress tracking</li>
          </ol>
        </Section>
        <Section title="Contact" id="enroll">
          <div className="font-mono text-sm space-y-1.5">
            <div><span className="text-muted-foreground">email:</span> <span className="text-primary">hello@edunexuz.io</span></div>
            <div><span className="text-muted-foreground">phone:</span> +44 20 4538 1102</div>
            <div><span className="text-muted-foreground">hq:</span> London / Berlin</div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Open this site on a larger screen to use the full warm desktop interface.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="border border-border bg-surface/60 p-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-primary text-glow mb-3">// {title}</h2>
      {children}
    </section>
  );
}

function DesktopInner({ initialOpen }: { initialOpen?: WindowId }) {
  const { open, close } = useWindowManager();
  const { setTheme } = useTheme();
  const [wallpaper, setWallpaper] = useState(() => {
    try { return localStorage.getItem("edunexuz-wallpaper") || ""; } catch { return ""; }
  });

  useEffect(() => {
    if (initialOpen && initialOpen !== "readme") open(initialOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for terminal-driven actions and wallpaper changes
  useEffect(() => {
    function onOpen(e: Event) {
      const id = (e as CustomEvent<WindowId>).detail;
      if (id) open(id);
    }
    function onClose(e: Event) {
      const id = (e as CustomEvent<WindowId>).detail;
      if (id) close(id);
    }
    function onTheme(e: Event) {
      const t = (e as CustomEvent<string>).detail as ThemeId;
      if (THEMES.some((x) => x.id === t)) setTheme(t);
    }
    function onWallpaper(e: Event) {
      const url = (e as CustomEvent<string>).detail;
      setWallpaper(url || "");
    }
    window.addEventListener("edunexuz-open-window", onOpen);
    window.addEventListener("edunexuz-close-window", onClose);
    window.addEventListener("edunexuz-set-theme", onTheme);
    window.addEventListener("edunexuz-wallpaper-change", onWallpaper);
    return () => {
      window.removeEventListener("edunexuz-open-window", onOpen);
      window.removeEventListener("edunexuz-close-window", onClose);
      window.removeEventListener("edunexuz-set-theme", onTheme);
      window.removeEventListener("edunexuz-wallpaper-change", onWallpaper);
    };
  }, [open, close, setTheme]);

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-background">
      <TopBar />
      <main
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundImage: wallpaper
            ? `url(${wallpaper})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Hex grid overlay (dimmed when wallpaper active) */}
        <div className={`absolute inset-0 hex-grid ${wallpaper ? "opacity-30" : ""}`} />

        {/* ambient warm orbs (hidden when wallpaper active) */}
        {!wallpaper && (
          <>
            <div className="ambient-orb animate-drift" style={{ top: "10%", left: "8%", width: 320, height: 320, background: "var(--amber-glow)" }} />
            <div className="ambient-orb animate-drift" style={{ bottom: "8%", right: "6%", width: 380, height: 380, background: "var(--primary)", animationDelay: "-6s" }} />
          </>
        )}

        <DesktopIcons />

        {/* Center branding (dimmed when wallpaper active) */}
        <div className={`absolute inset-0 grid place-items-center pointer-events-none select-none ${wallpaper ? "opacity-10" : ""}`}>
          <div className="text-center font-mono">
            <div className="text-primary/15 text-glow text-[10vw] leading-none tracking-widest">EDUNEXUZ</div>
            <div className="text-cyan-signal/40 text-xs uppercase tracking-[0.5em] mt-2">// warm // tutoring network</div>
          </div>
        </div>

        {/* All windows */}
        <ReadmeWindow />
        <ProgramsWindow />
        <InstructorsWindow />
        <EnrollWindow />
        <FirefoxWindow />
        <VSCodeWindow />
        <TerminalWindow />
        <SettingsWindow />
        <CoursesWindow />
        <LiveClassroomWindow />
        <CommunityWindow />
        <ProfileWindow />
        <DocumentSummarizerWindow />
        <AITutorWindow />

        <Dock />
      </main>
    </div>
  );
}

export function Desktop({ initialOpen }: { initialOpen?: WindowId }) {
  const [state, setState] = useState<"login" | "boot" | "desktop">("login");

  function doLogout() {
    try {
      localStorage.removeItem("edunexuz-token");
      localStorage.removeItem("edunexuz-user");
      localStorage.removeItem("edunexuz-profile");
    } catch {}
    try {
      sessionStorage.removeItem("edunexuz-booted");
    } catch {}
    setToken("");
    setState("login");
  }

  useEffect(() => {
    // Check if already logged in
    try {
      const user = localStorage.getItem("edunexuz-user");
      const booted = sessionStorage.getItem("edunexuz-booted");
      if (user && booted === "1") {
        setState("desktop");
      } else if (user) {
        setState("boot");
      }
    } catch {}
  }, []);

  useEffect(() => {
    function onLogout() {
      doLogout();
    }
    window.addEventListener("edunexuz-logout", onLogout);
    return () => window.removeEventListener("edunexuz-logout", onLogout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== "desktop") return;
    let mounted = true;
    api
      .me()
      .then(() => {
        if (!mounted) return;
      })
      .catch(() => {
        if (!mounted) return;
        doLogout();
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleLogin() {
    setState("boot");
  }

  function handleBooted() {
    sessionStorage.setItem("edunexuz-booted", "1");
    setState("desktop");
  }

  return (
    <WindowManagerProvider>
      {state === "login" && <LoginScreen onLogin={handleLogin} />}
      {state === "boot" && <BootSequence onDone={handleBooted} />}
      {state === "desktop" && (
        <>
          <div className="hidden md:block">
            <DesktopInner initialOpen={initialOpen} />
          </div>
          <MobileFallback />
        </>
      )}
      <Toaster />
    </WindowManagerProvider>
  );
}
