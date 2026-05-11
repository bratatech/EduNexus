import { FileText, Folder, Users, Send, Globe, Code2, TerminalSquare, Settings as SettingsIcon, BookOpen, GraduationCap, MessageCircle, UserCircle, Sparkles } from "lucide-react";
import { useWindowManager, type WindowId } from "@/lib/window-manager";
import { cn } from "@/lib/utils";

const ICONS: { id: WindowId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "readme", label: "readme.txt", Icon: FileText },
  { id: "programs", label: "programs/", Icon: Folder },
  { id: "instructors", label: "instructors/", Icon: Users },
  { id: "enroll", label: "enroll.form", Icon: Send },
  { id: "firefox", label: "Firefox", Icon: Globe },
  { id: "vscode", label: "VS Code", Icon: Code2 },
  { id: "terminal", label: "Terminal", Icon: TerminalSquare },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
  { id: "courses", label: "Courses", Icon: BookOpen },
  { id: "classroom", label: "Classroom", Icon: GraduationCap },
  { id: "tutor", label: "AI Tutor", Icon: Sparkles },
  { id: "summarizer", label: "Summarizer", Icon: Sparkles },
  { id: "community", label: "Community", Icon: MessageCircle },
  { id: "profile", label: "profile.txt", Icon: UserCircle },
];

export function DesktopIcons() {
  const { open, focus, windows } = useWindowManager();

  return (
    <div className="absolute top-4 left-4 z-10 grid grid-cols-2 gap-1 font-mono text-[11px] uppercase tracking-wider">
      {ICONS.map(({ id, label, Icon }) => {
        const isOpen = windows[id].isOpen;
        return (
          <button
            key={id}
            onDoubleClick={() => (isOpen ? focus(id) : open(id))}
            onClick={() => (isOpen ? focus(id) : open(id))}
            className="group flex flex-col items-center w-20 gap-1 p-2 rounded-sm hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-colors"
          >
            <span className={cn(
              "grid place-items-center h-12 w-12 rounded-sm border border-border bg-surface/70 group-hover:border-primary/60 group-hover:text-primary transition-colors",
              isOpen && "border-primary/60 text-primary"
            )}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-center text-foreground/80 group-hover:text-primary leading-tight truncate w-full">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
