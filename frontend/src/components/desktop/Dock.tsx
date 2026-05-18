import { useEffect, useMemo, useState } from "react";
import { Home, BookOpen, Users, Mail, Globe, Code2, TerminalSquare, Settings, GraduationCap, MessageCircle, UserCircle, Layers, Sparkles, ClipboardList } from "lucide-react";
import { useWindowManager, type WindowId } from "@/lib/window-manager";
import { cn } from "@/lib/utils";

const DOCK: { id: WindowId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "readme", label: "Home", Icon: Home },
  { id: "programs", label: "Programs", Icon: BookOpen },
  { id: "instructors", label: "Instructors", Icon: Users },
  { id: "enroll", label: "Enroll", Icon: Mail },
  { id: "firefox", label: "Firefox", Icon: Globe },
  { id: "vscode", label: "VS Code", Icon: Code2 },
  { id: "terminal", label: "Terminal", Icon: TerminalSquare },
  { id: "courses", label: "Courses", Icon: Layers },
  { id: "classroom", label: "Classroom", Icon: GraduationCap },
  { id: "practice", label: "Practice", Icon: ClipboardList },
  { id: "tutor", label: "AI Tutor", Icon: Sparkles },
  { id: "summarizer", label: "Summarizer", Icon: Sparkles },
  { id: "community", label: "Community", Icon: MessageCircle },
  { id: "profile", label: "Profile", Icon: UserCircle },
  { id: "settings", label: "Settings", Icon: Settings },
];

const PEEK_ZONE_PX = 12;

export function Dock() {
  const { open, focus, windows } = useWindowManager();
  const [peek, setPeek] = useState(false);

  const openCount = useMemo(
    () => Object.values(windows).filter((w) => w.isOpen && !w.isMinimized).length,
    [windows]
  );

  const autoHide = openCount > 0;
  const showDock = !autoHide || peek;

  useEffect(() => {
    if (!autoHide) {
      setPeek(false);
      return;
    }

    const onMove = (e: MouseEvent) => {
      setPeek(e.clientY >= window.innerHeight - PEEK_ZONE_PX);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [autoHide]);

  return (
    <>
      {autoHide && !peek && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 z-50"
          aria-hidden
          onMouseEnter={() => setPeek(true)}
        />
      )}

      <div
        className={cn(
          "absolute left-1/2 z-40 flex items-end gap-1 px-3 py-2 rounded-lg border border-border bg-surface-2/80 backdrop-blur window-shadow transition-all duration-300 ease-out",
          showDock
            ? "bottom-3 -translate-x-1/2 opacity-100 translate-y-0 pointer-events-auto"
            : "bottom-0 -translate-x-1/2 opacity-0 translate-y-[calc(100%+12px)] pointer-events-none"
        )}
        onMouseEnter={() => autoHide && setPeek(true)}
        onMouseLeave={() => autoHide && setPeek(false)}
      >
        {DOCK.map(({ id, label, Icon }, i) => {
          const w = windows[id];
          const active = w.isOpen;
          const divider = i === 4 || i === 7;
          return (
            <div key={id} className="flex items-end gap-1">
              {divider && <span className="mx-0.5 h-8 w-px bg-border self-center" />}
              <button
                title={label}
                onClick={() => (w.isOpen && !w.isMinimized ? focus(id) : open(id))}
                className={cn(
                  "relative grid place-items-center h-10 w-10 rounded-md border border-border bg-surface text-muted-foreground hover:text-primary hover:border-primary/60 hover:scale-110 active:scale-95 transition-all",
                  active && "text-primary border-primary/60"
                )}
              >
                <Icon className="h-5 w-5" />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_var(--amber-glow)]" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
