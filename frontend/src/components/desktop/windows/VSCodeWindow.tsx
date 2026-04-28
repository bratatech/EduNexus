import { useState } from "react";
import { Window } from "../Window";

const GITHUB1S_URL = "https://github1s.com/Shanxoxo-glitch/edunexuz-personal-portfolio";
const VSCODE_DEV_URL = "https://vscode.dev";

export function VSCodeWindow() {
  const [mode, setMode] = useState<"github1s" | "vscodedev">("github1s");
  const [loading, setLoading] = useState(true);

  const currentUrl = mode === "github1s" ? GITHUB1S_URL : VSCODE_DEV_URL;

  return (
    <Window id="vscode">
      <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
        {/* VS Code top bar */}
        <div className="flex items-center justify-between px-3 h-8" style={{ background: "#323233", borderBottom: "1px solid #3c3c3c" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M17.5 0L24 5.5V18.5L17.5 24L0 13L5 9.5L0 6L17.5 0Z" fill="#007ACC"/>
                <path d="M17.5 0L24 5.5V18.5L17.5 24V0Z" fill="#1F9CF0" fillOpacity="0.5"/>
                <path d="M0 6L5 9.5L0 13V6Z" fill="#007ACC"/>
                <path d="M5 9.5L17.5 0V24L0 13L5 9.5Z" fill="#007ACC" fillOpacity="0.25"/>
              </svg>
              <span className="text-[11px] text-gray-300 font-sans">Visual Studio Code</span>
            </div>
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
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-0.5 rounded overflow-hidden" style={{ border: "1px solid #3c3c3c" }}>
              <button
                onClick={() => { setMode("github1s"); setLoading(true); }}
                className={`px-2 py-0.5 text-[10px] transition-colors ${
                  mode === "github1s" ? "bg-[#007ACC] text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                GitHub1s
              </button>
              <button
                onClick={() => { setMode("vscodedev"); setLoading(true); }}
                className={`px-2 py-0.5 text-[10px] transition-colors ${
                  mode === "vscodedev" ? "bg-[#007ACC] text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                vscode.dev
              </button>
            </div>
          </div>
        </div>

        {/* iframe content */}
        <div className="flex-1 relative">
          <iframe
            key={mode}
            src={currentUrl}
            title="Visual Studio Code"
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
            onLoad={() => setLoading(false)}
          />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "#1e1e1e" }}>
              <svg className="h-16 w-16 mb-4 animate-pulse" viewBox="0 0 24 24" fill="none">
                <path d="M17.5 0L24 5.5V18.5L17.5 24L0 13L5 9.5L0 6L17.5 0Z" fill="#007ACC"/>
                <path d="M17.5 0L24 5.5V18.5L17.5 24V0Z" fill="#1F9CF0" fillOpacity="0.5"/>
                <path d="M0 6L5 9.5L0 13V6Z" fill="#007ACC"/>
                <path d="M5 9.5L17.5 0V24L0 13L5 9.5Z" fill="#007ACC" fillOpacity="0.25"/>
              </svg>
              <div className="text-gray-400 text-sm font-sans">Loading Visual Studio Code...</div>
              <div className="mt-3 w-48 h-1 rounded-full overflow-hidden" style={{ background: "#333" }}>
                <div className="h-full bg-[#007ACC] animate-pulse rounded-full" style={{ width: "60%" }} />
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 h-6 text-[11px]" style={{ background: "#007ACC" }}>
          <div className="flex items-center gap-3 text-white/90">
            <span>⎇ main</span>
            <span>● 0 ⚠ 0</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <span>{mode === "github1s" ? "GitHub1s" : "vscode.dev"}</span>
            <span>TypeScript</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </Window>
  );
}
