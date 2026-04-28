import { Sparkles, Target, GitBranch, Activity } from "lucide-react";
import { Window } from "../Window";
import { WindowSidebar } from "../WindowSidebar";
import { useWindowManager } from "@/lib/window-manager";

function Welcome() {
  const { open } = useWindowManager();
  return (
    <div className="p-8 space-y-6">
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary text-glow">
        // welcome_operator
      </div>
      <h1 className="font-mono text-4xl md:text-5xl leading-tight">
        EduNexuZ — <span className="text-primary text-glow">tutoring</span> for the
        <br />connected generation.
      </h1>
      <p className="text-foreground/80 max-w-xl leading-relaxed">
        We pair students with expert tutors across math, sciences, languages, computer science and
        test prep. Personalised plans, real progress, online or in-person — wired into a learning
        network that adapts to <em>you</em>.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={() => open("enroll")}
          className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-amber-glow transition-colors window-shadow"
        >
          ▸ Enroll now
        </button>
        <button
          onClick={() => open("programs")}
          className="px-5 py-2.5 border border-border text-foreground font-mono text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
        >
          Browse programs
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
        {[
          { k: "2,400+", v: "Students helped" },
          { k: "32", v: "Subjects covered" },
          { k: "+1.4", v: "Avg. grade gain" },
          { k: "24h", v: "Match time" },
        ].map((s) => (
          <div key={s.v} className="border border-border bg-surface/60 p-3 font-mono">
            <div className="text-primary text-glow text-2xl tabular-nums">{s.k}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mission() {
  return (
    <div className="p-8 space-y-5 max-w-2xl">
      <h2 className="font-mono text-2xl text-primary text-glow uppercase tracking-widest">// mission</h2>
      <p className="text-foreground/85 leading-relaxed">
        Every learner deserves a tutor who actually understands how they think. EduNexuZ exists to
        remove the friction between a curious student and the right mentor — fast, transparent,
        results-driven.
      </p>
      <p className="text-foreground/85 leading-relaxed">
        We believe learning is a system, not a luxury. Our network is built on three principles:
      </p>
      <ul className="space-y-3 font-mono text-sm">
        <li className="flex gap-3"><span className="text-primary">›</span><span><strong className="text-foreground">Diagnostic-first.</strong> <span className="text-muted-foreground">We assess before we teach.</span></span></li>
        <li className="flex gap-3"><span className="text-primary">›</span><span><strong className="text-foreground">Human + signal.</strong> <span className="text-muted-foreground">Real tutors, smart matching.</span></span></li>
        <li className="flex gap-3"><span className="text-primary">›</span><span><strong className="text-foreground">Outcome accountability.</strong> <span className="text-muted-foreground">If grades don't move, neither do we.</span></span></li>
      </ul>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Assess", d: "Free 20-min diagnostic call. We map current level, learning style, and the goal." },
    { n: "02", t: "Match", d: "Within 24h we pair you with a vetted tutor whose track record fits the brief." },
    { n: "03", t: "Learn", d: "Weekly sessions, shared progress dashboard, and monthly outcome reviews." },
  ];
  return (
    <div className="p-8 space-y-6">
      <h2 className="font-mono text-2xl text-primary text-glow uppercase tracking-widest">// how_it_works</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div key={s.n} className="border border-border bg-surface/60 p-5 relative overflow-hidden">
            <div className="absolute top-2 right-3 font-mono text-xs text-muted-foreground">{s.n}</div>
            <div className="font-mono text-lg text-primary uppercase tracking-widest mb-2">{s.t}</div>
            <p className="text-sm text-foreground/80 leading-relaxed">{s.d}</p>
            <div className="absolute bottom-0 left-0 h-0.5 w-1/3 bg-primary" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stats() {
  const rows = [
    { label: "Math (algebra → calculus)", val: 92 },
    { label: "Sciences (physics, chem, bio)", val: 88 },
    { label: "Languages (EN, ES, FR, DE)", val: 84 },
    { label: "Computer Science", val: 95 },
    { label: "Test prep (SAT, IB, A-Level)", val: 90 },
  ];
  return (
    <div className="p-8 space-y-6">
      <h2 className="font-mono text-2xl text-primary text-glow uppercase tracking-widest">// signal</h2>
      <p className="text-sm text-muted-foreground font-mono">avg. student satisfaction by subject — last 12 months</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="font-mono text-xs">
            <div className="flex justify-between mb-1 text-foreground/80"><span>{r.label}</span><span className="text-primary tabular-nums">{r.val}%</span></div>
            <div className="h-2 bg-surface border border-border overflow-hidden">
              <div className="h-full bg-primary shadow-[0_0_8px_var(--amber-glow)]" style={{ width: `${r.val}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReadmeWindow() {
  return (
    <Window id="readme">
      <WindowSidebar
        tabs={[
          { id: "welcome", label: "Welcome", icon: <Sparkles className="h-3.5 w-3.5" />, content: <Welcome /> },
          { id: "mission", label: "Mission", icon: <Target className="h-3.5 w-3.5" />, content: <Mission /> },
          { id: "how", label: "How it works", icon: <GitBranch className="h-3.5 w-3.5" />, content: <HowItWorks /> },
          { id: "stats", label: "Signal", icon: <Activity className="h-3.5 w-3.5" />, content: <Stats /> },
        ]}
      />
    </Window>
  );
}
