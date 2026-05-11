import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Window } from "../Window";

type WorkspaceFile = {
  id: string;
  name: string;
  language: string;
  content: string;
  updatedAt: string;
};

function getUserIdentity() {
  try {
    const raw = localStorage.getItem("edunexuz-user");
    if (!raw) return { wallet: "guest", name: "guest" };
    const parsed = JSON.parse(raw);
    const wallet = String(parsed?.wallet || parsed?.username || parsed?.id || "guest");
    const name = String(parsed?.name || parsed?.wallet || "guest");
    return { wallet, name };
  } catch {
    return { wallet: "guest", name: "guest" };
  }
}

function guessLanguageFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".c") || lower.endsWith(".h")) return "C";
  if (lower.endsWith(".cpp") || lower.endsWith(".hpp") || lower.endsWith(".cc")) return "C++";
  if (lower.endsWith(".java")) return "Java";
  if (lower.endsWith(".py")) return "Python";
  if (lower.endsWith(".js")) return "JavaScript";
  if (lower.endsWith(".ts")) return "TypeScript";
  if (lower.endsWith(".tsx")) return "TSX";
  if (lower.endsWith(".jsx")) return "JSX";
  if (lower.endsWith(".json")) return "JSON";
  if (lower.endsWith(".md")) return "Markdown";
  if (lower.endsWith(".html")) return "HTML";
  if (lower.endsWith(".css")) return "CSS";
  if (lower.endsWith(".rs")) return "Rust";
  if (lower.endsWith(".go")) return "Go";
  if (lower.endsWith(".rb")) return "Ruby";
  if (lower.endsWith(".sh")) return "Shell";
  return "Plain Text";
}

function getFileIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".py")) return "🐍";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "⬡";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "ᵀˢ";
  if (lower.endsWith(".c") || lower.endsWith(".cpp") || lower.endsWith(".h")) return "©";
  if (lower.endsWith(".java")) return "☕";
  if (lower.endsWith(".html")) return "◇";
  if (lower.endsWith(".css")) return "#";
  if (lower.endsWith(".json")) return "{}";
  if (lower.endsWith(".md")) return "M↓";
  if (lower.endsWith(".rs")) return "🦀";
  if (lower.endsWith(".go")) return "Go";
  return "📄";
}

function newFileTemplate(language: string) {
  if (language === "Python") return 'print("Hello, EduNexuZ!")\n';
  if (language === "C") return '#include <stdio.h>\n\nint main() {\n  printf("Hello, EduNexuZ!\\n");\n  return 0;\n}\n';
  if (language === "C++") return '#include <iostream>\n\nint main() {\n  std::cout << "Hello, EduNexuZ!\\n";\n  return 0;\n}\n';
  if (language === "Java") return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, EduNexuZ!");\n  }\n}\n';
  if (language === "JavaScript") return "console.log('Hello, EduNexuZ!');\n";
  if (language === "TypeScript") return "console.log('Hello, EduNexuZ!');\n";
  if (language === "Markdown") return "# Notes\n\n";
  return "";
}

function safeNowIso() {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

function defaultFiles(): WorkspaceFile[] {
  const now = safeNowIso();
  return [
    {
      id: "main",
      name: "main.py",
      language: "Python",
      content: newFileTemplate("Python"),
      updatedAt: now,
    },
    {
      id: "readme",
      name: "README.md",
      language: "Markdown",
      content: "# Workspace\n\nCreate files and start coding.\n",
      updatedAt: now,
    },
  ];
}

export function VSCodeWindow() {
  const identity = useMemo(() => getUserIdentity(), []);
  const storageKey = useMemo(() => `edunexuz-workspace-files:${identity.wallet}`,[identity.wallet]);

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const activeFile = useMemo(() => files.find((f) => f.id === activeId) || null, [files, activeId]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("main.py");
  const [renamingId, setRenamingId] = useState<string>("");
  const [renameName, setRenameName] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [runOutput, setRunOutput] = useState<string>("");
  const [runOpen, setRunOpen] = useState<boolean>(false);
  const [runBusy, setRunBusy] = useState<boolean>(false);

  const pyodideRef = useRef<any>(null);
  const pyodideLoadingRef = useRef<Promise<any> | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const normalized: WorkspaceFile[] = parsed
            .filter((x) => x && typeof x === "object")
            .map((x) => {
              const name = String(x.name || "file.txt");
              const language = String(x.language || guessLanguageFromName(name));
              return {
                id: String(x.id || name),
                name,
                language,
                content: String(x.content || ""),
                updatedAt: String(x.updatedAt || safeNowIso()),
              };
            });
          setFiles(normalized);
          setActiveId(String(normalized[0].id));
          setOpenTabs([String(normalized[0].id)]);
          return;
        }
      }
    } catch {}
    const seed = defaultFiles();
    setFiles(seed);
    setActiveId(seed[0]?.id || "");
    setOpenTabs([seed[0]?.id || ""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!files.length) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(files));
    } catch {}
  }, [files, storageKey]);

  // Sync scroll between line numbers and textarea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  function openFileTab(id: string) {
    setActiveId(id);
    if (!openTabs.includes(id)) {
      setOpenTabs((prev) => [...prev, id]);
    }
  }

  async function ensurePyodide() {
    if (pyodideRef.current) return pyodideRef.current;
    if (pyodideLoadingRef.current) return await pyodideLoadingRef.current;

    pyodideLoadingRef.current = (async () => {
      // Load Pyodide from CDN (browser-only)
      const w = window as any;
      if (!w.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Pyodide"));
          document.head.appendChild(script);
        });
      }

      if (!w.loadPyodide) {
        throw new Error("Pyodide loader not available");
      }

      const pyodide = await w.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/" });
      pyodideRef.current = pyodide;
      return pyodide;
    })();

    return await pyodideLoadingRef.current;
  }

  async function runActiveFile() {
    if (!activeFile) return;

    const lang = String(activeFile.language || "");

    setRunBusy(true);
    try {
      if (lang === "JavaScript") {
        const logs: string[] = [];
        const fakeConsole = {
          log: (...args: any[]) =>
            logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")),
          error: (...args: any[]) =>
            logs.push("[error] " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")),
        };

        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function("console", activeFile.content);
          fn(fakeConsole);
          setRunOutput((logs.length ? logs.join("\n") : "(no output)\n") + "\n[done]");
        } catch (e: any) {
          setRunOutput(
            (logs.length ? logs.join("\n") + "\n\n" : "") + `Runtime error: ${String(e?.message || e)}`
          );
        }
        setRunOpen(true);
        return;
      }

      if (lang === "Python") {
        const pyodide = await ensurePyodide();
        const code = String(activeFile.content || "");
        const wrapped =
          "import sys\n" +
          "from io import StringIO\n" +
          "_out = StringIO()\n" +
          "_err = StringIO()\n" +
          "_old_out, _old_err = sys.stdout, sys.stderr\n" +
          "sys.stdout, sys.stderr = _out, _err\n" +
          "try:\n" +
          "    exec(compile(" + JSON.stringify(code) + ", '<workspace>', 'exec'), {})\n" +
          "finally:\n" +
          "    sys.stdout, sys.stderr = _old_out, _old_err\n" +
          "\n" +
          "__js_out = _out.getvalue()\n" +
          "__js_err = _err.getvalue()\n";

        await pyodide.runPythonAsync(wrapped);
        const out = String(pyodide.globals.get("__js_out") || "");
        const err = String(pyodide.globals.get("__js_err") || "");
        const combined =
          (out.trim().length ? out : "") +
          (err.trim().length ? (out.trim().length ? "\n" : "") + "[stderr]\n" + err : "");
        setRunOutput((combined.trim().length ? combined.trimEnd() : "(no output)") + "\n\n[done]");
        setRunOpen(true);
        return;
      }

      setRunOutput(
        `Run is supported for JavaScript (.js) and Python (.py) in the web sandbox.\n\n` +
          `Current file: ${activeFile.name} (${activeFile.language})\n\n` +
          `C/C++/Java require a server-side compiler/runtime sandbox (not safe to run directly in-browser).\n` +
          `If you want, I can implement a backend runner with timeouts and allowlist checks for local development.`
      );
      setRunOpen(true);
    } finally {
      setRunBusy(false);
    }
  }

  function closeTab(id: string) {
    setOpenTabs((prev) => prev.filter((t) => t !== id));
    if (activeId === id) {
      const remaining = openTabs.filter((t) => t !== id);
      setActiveId(remaining[remaining.length - 1] || "");
    }
  }

  function upsertFile(id: string, updates: Partial<WorkspaceFile>) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function createFile(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.includes("/") || trimmed.includes("\\")) return;
    if (trimmed.endsWith("/")) return;
    if (files.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) return;

    const language = guessLanguageFromName(trimmed);
    const now = safeNowIso();
    const id = `${trimmed}:${now}`;
    const next: WorkspaceFile = {
      id,
      name: trimmed,
      language,
      content: newFileTemplate(language),
      updatedAt: now,
    };
    setFiles((prev) => [next, ...prev]);
    openFileTab(id);
  }

  function deleteFile(id: string) {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    closeTab(id);
  }

  const lineCount = activeFile ? (activeFile.content.split("\n").length) : 0;
  const workspaceTitle = `${identity.name} workspace`;

  // Handle Tab key in textarea (insert spaces instead of losing focus)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      if (activeFile) {
        upsertFile(activeFile.id, { content: newVal, updatedAt: safeNowIso() });
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }
    }
  }

  return (
    <Window id="vscode">
      <div className="flex flex-col h-full relative select-none" style={{ background: "#1e1e1e", fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace" }}>
        {/* VS Code Title Bar */}
        <div className="flex items-center justify-between px-3 h-[30px] shrink-0" style={{ background: "#323233", borderBottom: "1px solid #252526" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 100 100" fill="none">
                <path d="M73.2 0L100 23V77L73.2 100L0 54.2L20.8 39.6L0 25L73.2 0Z" fill="#007ACC"/>
                <path d="M73.2 0L100 23V77L73.2 100V0Z" fill="#1F9CF0" fillOpacity="0.5"/>
                <path d="M0 25L20.8 39.6L0 54.2V25Z" fill="#007ACC"/>
                <path d="M20.8 39.6L73.2 0V100L0 54.2L20.8 39.6Z" fill="#007ACC" fillOpacity="0.25"/>
              </svg>
              <span className="text-[11px] text-gray-400 font-sans">{workspaceTitle} — Visual Studio Code</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runActiveFile}
              className="px-2 h-6 rounded text-[11px]"
              style={{ border: "1px solid #3c3c3c", color: "#d4d4d4" }}
              title="Run"
            >
              Run
            </button>
            <button
              type="button"
              onClick={() => setRunOpen((v) => !v)}
              className="px-2 h-6 rounded text-[11px]"
              style={{ border: "1px solid #3c3c3c", color: "#9ca3af" }}
              title="Toggle Output"
            >
              Output
            </button>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="hover:text-gray-300 cursor-pointer">File</span>
            <span className="hover:text-gray-300 cursor-pointer">Edit</span>
            <span className="hover:text-gray-300 cursor-pointer">Selection</span>
            <span className="hover:text-gray-300 cursor-pointer">View</span>
            <span className="hover:text-gray-300 cursor-pointer">Go</span>
            <span className="hover:text-gray-300 cursor-pointer">Terminal</span>
            <span className="hover:text-gray-300 cursor-pointer">Help</span>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex min-h-0">
          {/* Activity Bar (icon sidebar) */}
          <div className="w-12 shrink-0 flex flex-col items-center pt-2 gap-4" style={{ background: "#333333", borderRight: "1px solid #252526" }}>
            <button
              className={`w-10 h-10 flex items-center justify-center rounded text-[18px] ${!sidebarCollapsed ? "text-white border-l-2 border-white" : "text-gray-500 hover:text-gray-300"}`}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title="Explorer"
              style={{ borderLeftColor: !sidebarCollapsed ? "#fff" : "transparent" }}
            >
              ☰
            </button>
            <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-300 text-[16px]" title="Search">🔍</button>
            <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-300 text-[16px]" title="Source Control">⎇</button>
            <button
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-300 text-[16px]"
              title="New File"
              onClick={() => { setCreating(true); setNewName("untitled.py"); }}
            >
              +
            </button>
          </div>

          {/* File Explorer Sidebar */}
          {!sidebarCollapsed && (
            <div className="w-56 shrink-0 flex flex-col min-h-0" style={{ background: "#252526", borderRight: "1px solid #1e1e1e" }}>
              <div className="flex items-center justify-between px-4 h-[35px] shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Explorer</span>
              </div>
              <div className="px-2 pt-2 pb-1">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold px-2 pb-1">
                  › {identity.name.toUpperCase()} WORKSPACE
                </div>
              </div>
              <div className="flex-1 overflow-auto px-1">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center gap-1.5 px-4 py-[3px] cursor-pointer text-[13px]"
                    style={{
                      background: activeId === f.id ? "#37373d" : "transparent",
                      color: activeId === f.id ? "#fff" : "#cccccc",
                    }}
                    onClick={() => openFileTab(f.id)}
                    onDoubleClick={() => openFileTab(f.id)}
                  >
                    <span className="text-[11px] w-5 text-center shrink-0 opacity-70">{getFileIcon(f.name)}</span>
                    <span className="truncate flex-1">{f.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="text-[10px] text-gray-500 hover:text-white px-0.5"
                        onClick={(e) => { e.stopPropagation(); setRenamingId(f.id); setRenameName(f.name); }}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="text-[10px] text-gray-500 hover:text-red-400 px-0.5"
                        onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 min-h-0 flex flex-col" style={{ background: "#1e1e1e" }}>
            {/* Tab bar */}
            <div className="flex items-center h-[35px] shrink-0 overflow-x-auto" style={{ background: "#252526", borderBottom: "1px solid #1e1e1e" }}>
              {openTabs.map((tabId) => {
                const tabFile = files.find((f) => f.id === tabId);
                if (!tabFile) return null;
                const isActive = activeId === tabId;
                return (
                  <div
                    key={tabId}
                    className="group flex items-center gap-2 px-3 h-full cursor-pointer shrink-0"
                    style={{
                      background: isActive ? "#1e1e1e" : "#2d2d2d",
                      borderRight: "1px solid #252526",
                      borderTop: isActive ? "1px solid #007ACC" : "1px solid transparent",
                    }}
                    onClick={() => setActiveId(tabId)}
                  >
                    <span className="text-[10px] opacity-60">{getFileIcon(tabFile.name)}</span>
                    <span className={`text-[12px] ${isActive ? "text-white" : "text-gray-400"}`}>{tabFile.name}</span>
                    <button
                      className="text-[10px] text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      onClick={(e) => { e.stopPropagation(); closeTab(tabId); }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Breadcrumb bar */}
            {activeFile && (
              <div className="flex items-center px-4 h-[22px] shrink-0 text-[11px] text-gray-500" style={{ background: "#1e1e1e", borderBottom: "1px solid #2a2a2a" }}>
                <span>{identity.name}</span>
                <span className="mx-1">›</span>
                <span className="text-gray-300">{activeFile.name}</span>
              </div>
            )}

            {/* Code editor with line numbers */}
            <div className="flex-1 min-h-0 flex relative" style={{ background: "#1e1e1e" }}>
              {activeFile ? (
                <>
                  {/* Line numbers gutter */}
                  <div
                    ref={lineNumRef}
                    className="shrink-0 text-right pr-3 pl-4 pt-1 overflow-hidden select-none"
                    style={{
                      background: "#1e1e1e",
                      color: "#858585",
                      fontSize: "13px",
                      lineHeight: "20px",
                      fontFamily: "inherit",
                      minWidth: "55px",
                      borderRight: "1px solid #2a2a2a",
                    }}
                  >
                    {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                      <div key={i + 1} style={{ height: "20px", color: i + 1 === (textareaRef.current ? textareaRef.current.value.substring(0, textareaRef.current.selectionStart).split("\n").length : 1) ? "#c6c6c6" : "#858585" }}>
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Text editor */}
                  <textarea
                    ref={textareaRef}
                    value={activeFile.content}
                    onChange={(e) => {
                      upsertFile(activeFile.id, { content: e.target.value, updatedAt: safeNowIso() });
                    }}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className="flex-1 resize-none outline-none pl-4 pr-4 pt-1 leading-[20px]"
                    style={{
                      background: "#1e1e1e",
                      color: "#d4d4d4",
                      fontSize: "13px",
                      lineHeight: "20px",
                      fontFamily: "inherit",
                      tabSize: 2,
                      caretColor: "#aeafad",
                    }}
                  />

                  {/* Minimap hint (decorative) */}
                  <div className="w-[60px] shrink-0" style={{ background: "#1e1e1e", borderLeft: "1px solid #2a2a2a" }}>
                    <div className="mt-1 mx-1">
                      {activeFile.content.split("\n").slice(0, 40).map((line, i) => (
                        <div
                          key={i}
                          style={{
                            height: "2px",
                            marginBottom: "1px",
                            background: line.trim() ? "rgba(212,212,212,0.15)" : "transparent",
                            width: `${Math.min(100, Math.max(10, line.length * 1.5))}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4 opacity-20">
                      <svg className="h-24 w-24 mx-auto" viewBox="0 0 100 100" fill="none">
                        <path d="M73.2 0L100 23V77L73.2 100L0 54.2L20.8 39.6L0 25L73.2 0Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="text-sm">Open a file from the explorer to start editing</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {runOpen && (
          <div className="shrink-0 border-t" style={{ borderColor: "#252526", background: "#1e1e1e" }}>
            <div className="flex items-center justify-between px-3 h-[26px]" style={{ background: "#252526", borderBottom: "1px solid #1e1e1e" }}>
              <div className="text-[11px] text-gray-300">Output</div>
              <button
                type="button"
                onClick={() => setRunOpen(false)}
                className="text-[11px] text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <pre
              className="m-0 p-3 text-[11px] overflow-auto max-h-[180px] text-gray-200 whitespace-pre-wrap"
              style={{ fontFamily: "inherit" }}
            >
              {runOutput || "(no output)"}
            </pre>
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 h-[22px] shrink-0 text-[11px]" style={{ background: "#007ACC" }}>
          <div className="flex items-center gap-3 text-white/90">
            <span>⎇ main</span>
            <span>● 0 ⚠ 0</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            {activeFile && <span>Ln {(activeFile.content.substring(0, textareaRef.current?.selectionStart ?? 0).split("\n").length)}, Col 1</span>}
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span>{activeFile?.language || "Plain Text"}</span>
          </div>
        </div>

        {/* Create file dialog */}
        {creating && (
          <div className="absolute inset-0 z-50" style={{ background: "rgba(0,0,0,0.55)" }}>
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[480px] rounded-md shadow-2xl" style={{ background: "#252526", border: "1px solid #3c3c3c" }}>
              <div className="px-4 py-2.5 text-[12px] text-gray-200 font-medium" style={{ borderBottom: "1px solid #3c3c3c" }}>
                New File
              </div>
              <form
                className="p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createFile(newName);
                  setCreating(false);
                }}
              >
                <div className="text-[11px] text-gray-400 mb-2">Enter file name (e.g., main.py, App.tsx, index.html)</div>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-[13px] text-gray-200 outline-none rounded"
                  style={{ background: "#3c3c3c", border: "1px solid #007ACC" }}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[12px] text-gray-300 rounded hover:bg-white/5"
                    style={{ border: "1px solid #3c3c3c" }}
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-[12px] text-white rounded"
                    style={{ background: "#007ACC" }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rename file dialog */}
        {renamingId && (
          <div className="absolute inset-0 z-50" style={{ background: "rgba(0,0,0,0.55)" }}>
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[480px] rounded-md shadow-2xl" style={{ background: "#252526", border: "1px solid #3c3c3c" }}>
              <div className="px-4 py-2.5 text-[12px] text-gray-200 font-medium" style={{ borderBottom: "1px solid #3c3c3c" }}>
                Rename File
              </div>
              <form
                className="p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = renameName.trim();
                  if (!trimmed) return;
                  if (trimmed.includes("/") || trimmed.includes("\\")) return;
                  if (trimmed.endsWith("/")) return;
                  if (files.some((f) => f.id !== renamingId && f.name.toLowerCase() === trimmed.toLowerCase())) return;
                  const lang = guessLanguageFromName(trimmed);
                  upsertFile(renamingId, { name: trimmed, language: lang, updatedAt: safeNowIso() });
                  setRenamingId("");
                }}
              >
                <div className="text-[11px] text-gray-400 mb-2">New file name</div>
                <input
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-[13px] text-gray-200 outline-none rounded"
                  style={{ background: "#3c3c3c", border: "1px solid #007ACC" }}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[12px] text-gray-300 rounded hover:bg-white/5"
                    style={{ border: "1px solid #3c3c3c" }}
                    onClick={() => setRenamingId("")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-[12px] text-white rounded"
                    style={{ background: "#007ACC" }}
                  >
                    Rename
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Window>
  );
}
