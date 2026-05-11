import { useEffect, useState, useRef, useCallback } from "react";
import { Window } from "../Window";
import { ArrowLeft, ArrowRight, RotateCw, Home, Star, Shield, Plus, X, Search, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
}

interface Bookmark {
  name: string;
  url: string;
}

const DEFAULT_URL = "https://www.wikipedia.org";

let tabCounter = 3;

function createTab(url: string = DEFAULT_URL): Tab {
  return {
    id: String(tabCounter++),
    title: "New Tab",
    url,
    history: [url],
    historyIndex: 0,
    loading: true,
  };
}

export function FirefoxWindow() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "1", title: "Wikipedia", url: DEFAULT_URL, history: [DEFAULT_URL], historyIndex: 0, loading: false },
  ]);
  const [activeTab, setActiveTab] = useState("1");
  const [urlInput, setUrlInput] = useState(DEFAULT_URL);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  useEffect(() => {
    let mounted = true;
    api
      .getContent<Bookmark[]>("firefox_bookmarks")
      .then((r) => {
        if (!mounted) return;
        setBookmarks(r.data || []);
      })
      .catch(() => {
        if (!mounted) return;
        setBookmarks([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const navigate = useCallback((url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;

    // Add protocol if missing
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      if (finalUrl.includes(".") && !finalUrl.includes(" ")) {
        finalUrl = "https://" + finalUrl;
      } else {
        // Search query
        finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTab) return t;
        const newHistory = [...t.history.slice(0, t.historyIndex + 1), finalUrl];
        return {
          ...t,
          url: finalUrl,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          loading: true,
        };
      })
    );
    setUrlInput(finalUrl);
  }, [activeTab]);

  const goBack = () => {
    if (!currentTab || currentTab.historyIndex <= 0) return;
    const newIndex = currentTab.historyIndex - 1;
    const newUrl = currentTab.history[newIndex];
    updateTab(currentTab.id, { url: newUrl, historyIndex: newIndex, loading: true });
    setUrlInput(newUrl);
  };

  const goForward = () => {
    if (!currentTab || currentTab.historyIndex >= currentTab.history.length - 1) return;
    const newIndex = currentTab.historyIndex + 1;
    const newUrl = currentTab.history[newIndex];
    updateTab(currentTab.id, { url: newUrl, historyIndex: newIndex, loading: true });
    setUrlInput(newUrl);
  };

  const reload = () => {
    if (!currentTab) return;
    updateTab(currentTab.id, { loading: true });
    if (iframeRef.current) {
      iframeRef.current.src = currentTab.url;
    }
  };

  const goHome = () => navigate(DEFAULT_URL);

  const addTab = () => {
    const t = createTab();
    setTabs((prev) => [...prev, t]);
    setActiveTab(t.id);
    setUrlInput(t.url);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      const newActive = newTabs[Math.min(idx, newTabs.length - 1)];
      setActiveTab(newActive.id);
      setUrlInput(newActive.url);
    }
  };

  const switchTab = (id: string) => {
    setActiveTab(id);
    const tab = tabs.find((t) => t.id === id);
    if (tab) setUrlInput(tab.url);
  };

  return (
    <Window id="firefox">
      <div className="flex flex-col h-full" style={{ background: "#1c1b22" }}>
        {/* Tab strip */}
        <div className="flex items-end gap-0.5 px-2 pt-1.5" style={{ background: "#1c1b22" }}>
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-md cursor-pointer max-w-[200px] ${
                activeTab === t.id
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              style={{
                background: activeTab === t.id ? "#42414d" : "transparent",
              }}
            >
              <span className="text-[10px]">🦊</span>
              <span className="truncate flex-1">{t.title}</span>
              {t.loading && <span className="animate-spin text-[10px]">⟳</span>}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTab}
            className="grid place-items-center h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded ml-1"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* URL bar */}
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#2b2a33", borderBottom: "1px solid #3a3944" }}>
          <button
            onClick={goBack}
            disabled={!currentTab || currentTab.historyIndex <= 0}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goForward}
            disabled={!currentTab || currentTab.historyIndex >= currentTab.history.length - 1}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={reload} className="text-gray-400 hover:text-white">
            <RotateCw className="h-4 w-4" />
          </button>
          <button onClick={goHome} className="text-gray-400 hover:text-white">
            <Home className="h-4 w-4" />
          </button>

          <form
            onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }}
            className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
            style={{ background: "#1c1b22", border: "1px solid #3a3944" }}
          >
            <Shield className="h-3.5 w-3.5 text-green-400 shrink-0" />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-200 placeholder:text-gray-500"
              placeholder="Search or enter address"
            />
            <Search className="h-3.5 w-3.5 text-gray-500" />
          </form>

          <button
            type="button"
            onClick={() => {
              if (!currentTab?.url) return;
              try {
                window.open(currentTab.url, "_blank", "noopener,noreferrer");
              } catch {}
            }}
            className="text-gray-400 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          <button className="text-gray-400 hover:text-white">
            <Star className="h-4 w-4" />
          </button>
        </div>

        {/* Bookmarks bar */}
        <div className="flex items-center gap-1 px-3 py-1" style={{ background: "#2b2a33", borderBottom: "1px solid #3a3944" }}>
          {bookmarks.map((b) => (
            <button
              key={b.name}
              onClick={() => navigate(b.url)}
              className="px-2 py-0.5 text-[11px] text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 relative" style={{ background: "#fff" }}>
          {currentTab && (
            <iframe
              ref={iframeRef}
              key={currentTab.id + "-" + currentTab.url}
              src={currentTab.url}
              title={currentTab.title}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              referrerPolicy="no-referrer"
              allow="clipboard-read; clipboard-write"
              onLoad={() => {
                updateTab(currentTab.id, {
                  loading: false,
                  title: currentTab.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "New Tab",
                });
              }}
              onError={() => updateTab(currentTab.id, { loading: false, title: "Error" })}
            />
          )}
          {currentTab?.loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 z-10">
              <div className="h-full bg-blue-500 animate-pulse" style={{ width: "60%", boxShadow: "0 0 10px rgba(59,130,246,0.5)" }} />
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}
