import { useState, useEffect } from "react";
import { Window } from "../Window";
import { useTheme } from "@/lib/theme-provider";
import { Check, Palette, Image, Info, Download, Search, X, ExternalLink } from "lucide-react";

const WALLPAPERS = [
  { id: "default", name: "Default", url: "", preview: "" },
  { id: "galaxy", name: "Galaxy", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80", preview: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=300&q=60" },
  { id: "mountains", name: "Mountains", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80", preview: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=60" },
  { id: "ocean", name: "Ocean", url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80", preview: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=300&q=60" },
  { id: "forest", name: "Dark Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80", preview: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&q=60" },
  { id: "aurora", name: "Aurora", url: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1920&q=80", preview: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=300&q=60" },
  { id: "city", name: "Night City", url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80", preview: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300&q=60" },
  { id: "abstract", name: "Abstract", url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80", preview: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=300&q=60" },
  { id: "space", name: "Deep Space", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80", preview: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=60" },
];

type SettingsTab = "appearance" | "wallpaper" | "about";

export function SettingsWindow() {
  const { theme, setTheme, themes } = useTheme();
  const current = themes.find((t) => t.id === theme);

  const [tab, setTab] = useState<SettingsTab>("appearance");
  const [wallpaper, setWallpaper] = useState(() => {
    try { return localStorage.getItem("edunexuz-wallpaper") || ""; } catch { return ""; }
  });
  const [customUrl, setCustomUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ url: string; preview: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);

  const [systemInfo, setSystemInfo] = useState({ resolution: "1920×1080", browser: "Unknown" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSystemInfo({
        resolution: `${window.innerWidth}×${window.innerHeight}`,
        browser: typeof navigator !== "undefined" ? navigator.userAgent.split(" ").pop() || "Unknown" : "Unknown",
      });
    }
  }, []);

  const applyWallpaper = (url: string) => {
    setWallpaper(url);
    try { localStorage.setItem("edunexuz-wallpaper", url); } catch {}
    window.dispatchEvent(new CustomEvent("edunexuz-wallpaper-change", { detail: url }));
  };

  const searchUnsplash = () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    // Generate Unsplash results based on search
    const results = Array.from({ length: 8 }, (_, i) => ({
      url: `https://source.unsplash.com/1920x1080/?${encodeURIComponent(searchQuery)}&sig=${i}`,
      preview: `https://source.unsplash.com/300x200/?${encodeURIComponent(searchQuery)}&sig=${i}`,
      name: `${searchQuery} ${i + 1}`,
    }));
    setSearchResults(results);
    setSearching(false);
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "appearance", label: "Appearance", icon: <Palette className="h-3.5 w-3.5" /> },
    { id: "wallpaper", label: "Wallpaper", icon: <Image className="h-3.5 w-3.5" /> },
    { id: "about", label: "About", icon: <Info className="h-3.5 w-3.5" /> },
  ];

  return (
    <Window id="settings">
      <div className="flex h-full bg-surface">
        {/* Sidebar */}
        <aside className="w-48 border-r border-border bg-surface-2/60 p-3 font-mono text-xs">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// Settings</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 w-full px-2 py-2 rounded text-left transition-all ${
                tab === t.id
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface border-l-2 border-transparent"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {tab === "appearance" && (
            <>
              <header className="mb-6">
                <h2 className="text-xl text-foreground">Appearance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose an ambient mood for the EduNexuZ workspace.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-xs">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="text-primary font-mono uppercase tracking-wider">{current?.name ?? theme}</span>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {themes.map((t) => {
                  const active = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`group relative text-left p-3 rounded-md border transition-all ${
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                          : "border-border bg-surface-2/40 hover:border-primary/50 hover:bg-surface-2/70"
                      }`}
                    >
                      <div className="flex h-16 rounded overflow-hidden border border-border mb-2.5">
                        {t.swatch.map((c, i) => (
                          <div key={i} className="flex-1" style={{ background: c }} />
                        ))}
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground font-medium">{t.name}</span>
                        {active && (
                          <span className="grid place-items-center h-4 w-4 rounded-full bg-primary text-primary-foreground">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{t.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 p-4 border border-border bg-surface-2/40 rounded-md">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">// tip</div>
                <p className="text-sm text-foreground/85">
                  You can also change theme from the Terminal: <span className="font-mono text-primary">theme sunset</span>.
                </p>
              </div>
            </>
          )}

          {tab === "wallpaper" && (
            <>
              <header className="mb-6">
                <h2 className="text-xl text-foreground">Wallpaper</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a wallpaper for your desktop background.
                </p>
                {wallpaper && (
                  <button
                    onClick={() => applyWallpaper("")}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-destructive border border-destructive/30 hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" /> Reset to default
                  </button>
                )}
              </header>

              {/* Preset wallpapers */}
              <div className="mb-6">
                <h3 className="text-sm text-foreground mb-3 font-medium">Presets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {WALLPAPERS.map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => applyWallpaper(wp.url)}
                      className={`relative rounded-lg overflow-hidden border transition-all hover:scale-105 ${
                        wallpaper === wp.url ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {wp.preview ? (
                        <img src={wp.preview} alt={wp.name} className="w-full h-20 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-20 hex-grid" />
                      )}
                      <div className="px-2 py-1.5 text-[10px] text-foreground/80 bg-surface-2/80 font-mono flex items-center justify-between">
                        {wp.name}
                        {wallpaper === wp.url && <Check className="h-3 w-3 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom URL */}
              <div className="mb-6 p-4 rounded-lg border border-border bg-surface-2/30">
                <h3 className="text-sm text-foreground mb-2 font-medium flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  From URL
                </h3>
                <div className="flex gap-2">
                  <input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/wallpaper.jpg"
                    className="flex-1 px-3 py-2 text-sm bg-input/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => { if (customUrl.trim()) applyWallpaper(customUrl.trim()); }}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Search Unsplash */}
              <div className="mb-6 p-4 rounded-lg border border-border bg-surface-2/30">
                <h3 className="text-sm text-foreground mb-2 font-medium flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Browse from Internet
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUnsplash()}
                    placeholder="Search wallpapers (nature, space, abstract...)"
                    className="flex-1 px-3 py-2 text-sm bg-input/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                  />
                  <button
                    onClick={searchUnsplash}
                    disabled={searching}
                    className="px-4 py-2 text-sm bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/30 transition-colors"
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => applyWallpaper(r.url)}
                        className="rounded-lg overflow-hidden border border-border hover:border-primary/50 hover:scale-105 transition-all"
                      >
                        <img src={r.preview} alt={r.name} className="w-full h-16 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "about" && (
            <>
              <header className="mb-6">
                <h2 className="text-xl text-foreground">About EduNexuZ</h2>
              </header>
              <div className="space-y-4 text-sm text-foreground/85">
                <div className="p-4 rounded-lg border border-border bg-surface-2/30">
                  <div className="font-mono text-xs text-primary mb-2">// System Information</div>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div><span className="text-muted-foreground">OS:</span> EduNexuZ ctOS v3.14</div>
                    <div><span className="text-muted-foreground">Kernel:</span> JavaScript ES2024</div>
                    <div><span className="text-muted-foreground">Shell:</span> EduNexuZ Terminal (bash-like)</div>
                    <div><span className="text-muted-foreground">DE:</span> EduNexuZ Desktop Environment</div>
                    <div><span className="text-muted-foreground">WM:</span> WindowManager.tsx</div>
                    <div><span className="text-muted-foreground">Theme:</span> {current?.name ?? theme}</div>
                    <div><span className="text-muted-foreground">Resolution:</span> {systemInfo.resolution}</div>
                    <div><span className="text-muted-foreground">Browser:</span> {systemInfo.browser}</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-surface-2/30">
                  <div className="font-mono text-xs text-primary mb-2">// Credits</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    EduNexuZ is a Watch Dogs 2 inspired Ubuntu-like virtual desktop environment
                    built with React, TypeScript, Tailwind CSS, and Three.js. Designed as a
                    creative portfolio and educational platform.
                  </p>
                  <a
                    href="https://github.com/Shanxoxo-glitch/edunexuz-personal-portfolio"
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View on GitHub
                  </a>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </Window>
  );
}
