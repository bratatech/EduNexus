import { Home, BookOpen, Users, Mail, Globe, Code2, TerminalSquare, Settings, GraduationCap, MessageCircle, UserCircle, Layers, Sparkles } from "lucide-react";
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
  { id: "tutor", label: "AI Tutor", Icon: Sparkles },
  { id: "summarizer", label: "Summarizer", Icon: Sparkles },
  { id: "community", label: "Community", Icon: MessageCircle },
  { id: "profile", label: "Profile", Icon: UserCircle },
  { id: "settings", label: "Settings", Icon: Settings },
];

export function Dock() {
  const { open, focus, windows } = useWindowManager();
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-end gap-1 px-3 py-2 rounded-lg border border-border bg-surface-2/80 backdrop-blur window-shadow">
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
  );
}
