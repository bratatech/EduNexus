import { useEffect, useState } from "react";
import { Calculator, FlaskConical, Languages, Code, GraduationCap } from "lucide-react";
import { Window } from "../Window";
import { useWindowManager } from "@/lib/window-manager";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const CATEGORIES = [
  { id: "math", label: "Math", Icon: Calculator },
  { id: "science", label: "Sciences", Icon: FlaskConical },
  { id: "lang", label: "Languages", Icon: Languages },
  { id: "cs", label: "Computer Science", Icon: Code },
  { id: "prep", label: "Test Prep", Icon: GraduationCap },
] as const;

type Cat = typeof CATEGORIES[number]["id"];

interface Program {
  cat: Cat;
  title: string;
  level: string;
  duration: string;
  format: string;
  desc: string;
}

export function ProgramsWindow() {
  const [cat, setCat] = useState<Cat>("math");
  const { open } = useWindowManager();
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .getContent("programs")
      .then((r) => {
        if (!mounted) return;
        setPrograms((r?.data || []) as Program[]);
      })
      .catch(() => {
        if (!mounted) return;
        setPrograms([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const list = programs.filter((p) => p.cat === cat);

  return (
    <Window id="programs">
      <div className="flex h-full">
        <aside className="w-48 shrink-0 border-r border-border bg-surface-2/60 py-3 font-mono text-xs uppercase tracking-wider">
          <div className="px-3 pb-2 text-[10px] text-muted-foreground">/ subjects</div>
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setCat(id)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-left transition-colors border-l-2",
                cat === id
                  ? "bg-primary/15 text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-surface"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </aside>
        <div className="flex-1 overflow-auto p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
            ./programs/{cat} <span className="text-primary">— {list.length} entries</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((p) => (
              <div key={p.title} className="border border-border bg-surface/60 p-4 hover:border-primary/60 transition-colors group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-mono text-sm text-foreground group-hover:text-primary transition-colors">{p.title}</h3>
                  <span className="font-mono text-[10px] text-primary border border-primary/40 px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">{p.level}</span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed mb-3">{p.desc}</p>
                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span>⏱ {p.duration}</span>
                  <span>◇ {p.format}</span>
                </div>
                <button
                  onClick={() => open("enroll")}
                  className="mt-3 w-full py-1.5 text-[11px] font-mono uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  ▸ Enroll
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Window>
  );
}
