import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

export function WindowSidebar({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="flex h-full">
      <aside className="w-44 shrink-0 border-r border-border bg-surface-2/60 py-3 font-mono text-xs uppercase tracking-wider">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-left transition-colors border-l-2",
              active === t.id
                ? "bg-primary/15 text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-surface"
            )}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </aside>
      <div className="flex-1 overflow-auto">{current.content}</div>
    </div>
  );
}
