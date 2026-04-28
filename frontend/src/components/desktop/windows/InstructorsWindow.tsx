import { useEffect, useState } from "react";
import { Users, BookText } from "lucide-react";
import { Window } from "../Window";
import { WindowSidebar } from "../WindowSidebar";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Tutor {
  name: string;
  subjects: string;
  years: number;
  rating: number;
  bio: string;
}

interface Post {
  title: string;
  read: string;
  tag: string;
}

function useTutorsAndPosts() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.getContent("tutors"), api.getContent("posts")])
      .then(([t, p]) => {
        if (!mounted) return;
        setTutors((t?.data || []) as Tutor[]);
        setPosts((p?.data || []) as Post[]);
      })
      .catch(() => {
        if (!mounted) return;
        setTutors([]);
        setPosts([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { tutors, posts };
}

function Tutors({ tutors }: { tutors: Tutor[] }) {
  return (
    <div className="p-6">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
        ./tutors <span className="text-primary">— {tutors.length} active operators</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {tutors.map((t) => (
          <div key={t.name} className="border border-border bg-surface/60 p-4 flex gap-3 hover:border-primary/60 transition-colors">
            <div className="shrink-0 grid place-items-center h-14 w-14 border border-border bg-surface text-primary font-mono">
              {t.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-mono text-sm text-foreground truncate">{t.name}</h3>
                <span className="font-mono text-[10px] text-primary">★ {t.rating}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-signal mb-1.5">{t.subjects}</div>
              <p className="text-xs text-foreground/70 leading-relaxed">{t.bio}</p>
              <div className="font-mono text-[10px] text-muted-foreground mt-2">⏳ {t.years} yrs experience</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldNotes({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="p-6">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
        ./field-notes <span className="text-primary">— learning intel from the network</span>
      </div>
      <ul className="divide-y divide-border border border-border bg-surface/40">
        {posts.map((p, i) => (
          <li key={p.title}>
            <button
              onClick={() => setActive(active === i ? null : i)}
              className={cn(
                "w-full text-left p-4 hover:bg-primary/5 transition-colors flex items-center justify-between gap-4",
                active === i && "bg-primary/10"
              )}
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{p.tag}</div>
                <div className="text-sm text-foreground/90 truncate">{p.title}</div>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">{p.read}</span>
            </button>
            {active === i && (
              <div className="px-4 pb-4 text-xs text-foreground/75 leading-relaxed border-t border-border bg-background/30">
                <p className="pt-3">
                  Preview not available offline. Full article is part of our member newsletter — drop us a
                  request via <span className="text-primary">enroll.form</span> to get on the list.
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InstructorsWindow() {
  const { tutors, posts } = useTutorsAndPosts();
  return (
    <Window id="instructors">
      <WindowSidebar
        tabs={[
          { id: "tutors", label: "Tutors", icon: <Users className="h-3.5 w-3.5" />, content: <Tutors tutors={tutors} /> },
          { id: "notes", label: "Field notes", icon: <BookText className="h-3.5 w-3.5" />, content: <FieldNotes posts={posts} /> },
        ]}
      />
    </Window>
  );
}
