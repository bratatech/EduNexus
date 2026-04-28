import { useEffect, useState } from "react";
import { Window } from "../Window";
import { BookOpen, Users, Clock, Trophy, ExternalLink, ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface Course {
  id: string;
  icon: string;
  title: string;
  instructor: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  students: number;
  progress: number;
  reward: number;
  color: string;
  gradient: string;
}

const LEVEL_COLORS = {
  Beginner: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  Intermediate: { bg: "rgba(249,115,22,0.15)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
  Advanced: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

export function CoursesWindow() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "Beginner" | "Intermediate" | "Advanced">("all");

  const [courses, setCourses] = useState<Course[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getContent("courses")
      .then((r) => {
        if (!mounted) return;
        setCourses((r?.data || []) as Course[]);
      })
      .catch(() => {
        if (!mounted) return;
        setCourses([]);
      });

    api
      .tokenBalance()
      .then((r) => {
        if (!mounted) return;
        setTokenBalance(Number(r?.balance ?? 0));
      })
      .catch(() => {
        if (!mounted) return;
        setTokenBalance(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = filter === "all" ? courses : courses.filter((c) => c.level === filter);

  return (
    <Window id="courses">
      <div className="flex h-full" style={{ background: "#0f0f14" }}>
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r p-4 flex flex-col gap-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,20,0.95)" }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(240,163,90,0.5)" }}>
              // Courses
            </div>
            <div className="flex flex-col gap-1">
              {(["all", "Beginner", "Intermediate", "Advanced"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-left px-3 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                    filter === f
                      ? "bg-amber-500/15 text-amber-400 border-l-2 border-amber-400"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                >
                  {f === "all" ? "All Courses" : f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-3 rounded-lg" style={{ background: "rgba(240,163,90,0.05)", border: "1px solid rgba(240,163,90,0.1)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-mono">EDUV Rewards</span>
            </div>
            <div className="text-2xl font-mono text-amber-400">{tokenBalance === null ? "—" : tokenBalance.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 mt-1">tokens earned</div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl text-white font-medium">Course Catalog</h2>
              <p className="text-sm text-gray-500 mt-1">{filtered.length} courses available</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-gray-400">Earn EDUV tokens by completing courses</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((course) => (
              <div
                key={course.id}
                className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "rgba(20,20,28,0.8)",
                  border: `1px solid ${course.color}22`,
                  boxShadow: `0 0 0 0 ${course.color}00`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${course.color}44`;
                  e.currentTarget.style.boxShadow = `0 0 30px ${course.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${course.color}22`;
                  e.currentTarget.style.boxShadow = `0 0 0 0 ${course.color}00`;
                }}
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl grid place-items-center text-2xl"
                        style={{ background: `${course.color}15`, border: `1px solid ${course.color}30` }}
                      >
                        {course.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{course.title}</h3>
                        <p className="text-sm text-gray-500">{course.instructor}</p>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                      style={{
                        background: LEVEL_COLORS[course.level].bg,
                        color: LEVEL_COLORS[course.level].text,
                        border: `1px solid ${LEVEL_COLORS[course.level].border}`,
                      }}
                    >
                      {course.level}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{course.description}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {course.students} students
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500">{course.progress > 0 ? `${course.progress}% Complete` : "Not started"}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${course.progress}%`,
                          background: course.color,
                          boxShadow: course.progress > 0 ? `0 0 10px ${course.color}50` : "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: `${course.color}20`,
                        color: course.color,
                        border: `1px solid ${course.color}30`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${course.color}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${course.color}20`;
                      }}
                    >
                      {course.progress > 0 ? (
                        <>Continue Course <ChevronRight className="h-4 w-4" /></>
                      ) : (
                        <>Start Course <ChevronRight className="h-4 w-4" /></>
                      )}
                    </button>

                    <button
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs transition-all"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#9ca3af",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Explorer
                    </button>
                  </div>

                  {/* Reward badge */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: "rgba(240,163,90,0.1)", border: "1px solid rgba(240,163,90,0.2)" }}
                    >
                      <Trophy className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-amber-400">Claim Rewards</span>
                    </button>
                    <span className="text-xs font-mono text-amber-400/70">
                      Earn: {course.reward} EDUV
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Window>
  );
}
