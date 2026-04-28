import { useEffect, useRef, useState, useCallback } from "react";
import { Window } from "../Window";
import { api } from "@/lib/api";

interface Line { kind: "in" | "out" | "system"; text: string; }

const PROMPT = "operator@edunexuz:~$";

const WELCOME = [
  "EduNexuZ Terminal v3.14 — Ubuntu-style Shell",
  "Type 'help' to see available commands.",
  "",
];

const DEFAULT_FILESYSTEM: Record<string, string | Record<string, string>> = {
  "readme.txt": "EduNexuZ — Warm tutoring for the connected generation.\nMath · Sciences · Languages · CS · Test prep.\nFree diagnostic call. Vetted tutors. Matched in 24h.",
  "profile.txt": "Operator: guest\nRole: Student\nJoined: Today\nCourses: 0",
  "programs/": "algebra-foundations/  calculus-bootcamp/  physics-mechanics/  python-from-zero/  web3-fundamentals/",
  "instructors/": "mira-k.txt  diego-r.txt  sana-a.txt  theo-v.txt  alex-chen.txt  dr-sarah-kim.txt",
  "courses/": "web3-fundamentals/  ai-ml/  metaverse-dev/  digital-marketing/",
  ".bashrc": '# EduNexuZ bash config\nexport PS1="operator@edunexuz:~$ "\nexport EDITOR=nano\nalias ll="ls -la"\nalias cls=clear',
  ".hidden_secret": "🎉 You found the easter egg! ctOS access level: UNLIMITED",
};

const COMMANDS: Record<string, string> = {
  help: `Available commands:
  help              show this help
  ls [dir]          list directory contents
  cat <file>        read file contents
  cd <dir>          change directory (simulated)
  pwd               print working directory
  whoami            current operator
  hostname          system hostname
  uname -a          system information
  date              current date and time
  echo <text>       print text
  clear / cls       clear terminal
  neofetch          system info display
  history           command history
  touch <file>      create empty file
  mkdir <dir>       create directory
  rm <file>         remove file
  grep <pattern>    search in files
  ps aux            list processes
  top               system monitor
  ping <host>       ping a host
  curl <url>        fetch URL
  python3           python REPL (simulated)
  node              node REPL (simulated)
  apt install       package manager (simulated)
  sudo <cmd>        run as root
  cowsay <text>     cow says something
  fortune           random fortune
  matrix            matrix rain effect
  hack              initiate hack sequence
  theme <name>      change desktop theme
  open <app>        open desktop application
  exit              close terminal`,
};

const DEFAULT_FORTUNES = [
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "A wise person once said nothing at all.",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "In the middle of difficulty lies opportunity. — Albert Einstein",
  "Code is like humor. When you have to explain it, it's bad.",
  "There are only 10 types of people in the world: those who understand binary, and those who don't.",
  "It works on my machine. ¯\\_(ツ)_/¯",
  "To understand recursion, you must first understand recursion.",
];

const NEOFETCH = `
       \x1b[33m_nnnn_\x1b[0m          operator@edunexuz
      \x1b[33mdGGGGMMb\x1b[0m         ──────────────────
     \x1b[33m@p~qp~~qMb\x1b[0m        OS: EduNexuZ ctOS v3.14
     \x1b[33mM|@||@) M|\x1b[0m        Host: Browser Virtual Machine
     \x1b[33m@,----.JM|\x1b[0m        Kernel: JavaScript ES2024
    \x1b[33mJS^\\__/  qKL\x1b[0m       Uptime: since page load
   \x1b[33mdZP        qKRb\x1b[0m     Packages: npm (managed)
  \x1b[33mdZP          qKKb\x1b[0m    Shell: bash 5.2
 \x1b[33mfZP            SMMb\x1b[0m   Resolution: ${window.innerWidth}x${window.innerHeight}
 \x1b[33mHZM            MMMM\x1b[0m   DE: EduNexuZ Desktop
 \x1b[33mFqM            MMMM\x1b[0m   WM: WindowManager.tsx
\x1b[33m__| ".        |\\dS"qML\x1b[0m  Theme: Watch Dogs 2
\x1b[33m|    \`.       | \`' \\Zq\x1b[0m  Terminal: EduNexuZ Term
\x1b[33m_)      \\.___.,|     .'\x1b[0m  CPU: V8 JavaScript Engine
\x1b[33m\\____   )MMMMMP|   .'\x1b[0m   Memory: ${Math.round((performance as any)?.memory?.usedJSHeapSize / 1024 / 1024 || 64)}MB / ${Math.round((performance as any)?.memory?.jsHeapSizeLimit / 1024 / 1024 || 512)}MB
\x1b[33m     \`-'       \`--'\x1b[0m`;

export function TerminalWindow() {
  const [lines, setLines] = useState<Line[]>(
    WELCOME.map((text) => ({ kind: "system" as const, text }))
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cwd, setCwd] = useState("~");
  const [filesystem, setFilesystem] = useState<Record<string, string | Record<string, string>>>(DEFAULT_FILESYSTEM);
  const [fortunes, setFortunes] = useState<string[]>(DEFAULT_FORTUNES);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.getContent("terminal_filesystem"), api.getContent("terminal_fortunes")])
      .then(([fsRes, fRes]) => {
        if (!mounted) return;
        if (fsRes?.data) setFilesystem(fsRes.data as Record<string, string | Record<string, string>>);
        if (Array.isArray(fRes?.data)) setFortunes(fRes.data as string[]);
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const addLines = useCallback((newLines: Line[]) => {
    setLines((ls) => [...ls, ...newLines]);
  }, []);

  function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  }

  function run(cmd: string) {
    const trimmed = cmd.trim();
    const out: Line[] = [{ kind: "in", text: `${PROMPT} ${cmd}` }];
    const [name, ...args] = trimmed.split(/\s+/);
    const argStr = args.join(" ");

    if (trimmed) {
      setHistory((h) => [...h, trimmed]);
      setHistoryIdx(-1);
    }

    switch (name) {
      case "":
        break;
      case "help":
        COMMANDS.help.split("\n").forEach((l) => out.push({ kind: "out", text: l }));
        break;
      case "ls": {
        const dir = args[0] || "";
        const showAll = dir === "-a" || dir === "-la" || dir === "-al";
        let items = Object.keys(filesystem);
        if (showAll) items = [".bashrc", ".hidden_secret", ...items];
        out.push({ kind: "out", text: items.join("  ") });
        break;
      }
      case "cat": {
        const file = args[0];
        if (!file) { out.push({ kind: "out", text: "cat: missing file operand" }); break; }
        const content = filesystem[file];
        if (typeof content === "string") {
          content.split("\n").forEach((l) => out.push({ kind: "out", text: l }));
        } else { out.push({ kind: "out", text: `cat: ${file}: No such file or directory` }); }
        break;
      }
      case "cd":
        if (!args[0] || args[0] === "~") setCwd("~");
        else if (filesystem[args[0] + "/"]) setCwd(`~/${args[0]}`);
        else out.push({ kind: "out", text: `cd: ${args[0]}: No such file or directory` });
        break;
      case "pwd":
        out.push({ kind: "out", text: `/home/operator${cwd === "~" ? "" : cwd.replace("~", "")}` });
        break;
      case "whoami":
        out.push({ kind: "out", text: "operator" });
        break;
      case "hostname":
        out.push({ kind: "out", text: "edunexuz-vm" });
        break;
      case "uname":
        out.push({ kind: "out", text: "EduNexuZ ctOS 3.14.0-edunexuz SMP BROWSER x86_64 JavaScript/V8" });
        break;
      case "date":
        out.push({ kind: "out", text: new Date().toString() });
        break;
      case "echo":
        out.push({ kind: "out", text: argStr });
        break;
      case "clear":
      case "cls":
        setLines([]);
        return;
      case "neofetch":
        stripAnsi(NEOFETCH).split("\n").forEach((l) => out.push({ kind: "out", text: l }));
        break;
      case "history":
        history.forEach((h, i) => out.push({ kind: "out", text: `  ${i + 1}  ${h}` }));
        break;
      case "touch":
        if (args[0]) out.push({ kind: "system", text: `Created file: ${args[0]}` });
        else out.push({ kind: "out", text: "touch: missing file operand" });
        break;
      case "mkdir":
        if (args[0]) out.push({ kind: "system", text: `Created directory: ${args[0]}/` });
        else out.push({ kind: "out", text: "mkdir: missing operand" });
        break;
      case "rm":
        if (args[0]) out.push({ kind: "system", text: `Removed: ${args[0]}` });
        else out.push({ kind: "out", text: "rm: missing operand" });
        break;
      case "grep":
        out.push({ kind: "out", text: `Searching for "${argStr}"...` });
        Object.entries(filesystem).forEach(([k, v]) => {
          if (typeof v === "string" && v.toLowerCase().includes(argStr.toLowerCase())) {
            out.push({ kind: "out", text: `${k}: ${v.split("\n").find((l) => l.toLowerCase().includes(argStr.toLowerCase())) || ""}` });
          }
        });
        break;
      case "ps":
        out.push({ kind: "out", text: "  PID TTY          TIME CMD" });
        out.push({ kind: "out", text: "    1 ?        00:00:00 init" });
        out.push({ kind: "out", text: "  142 ?        00:00:01 edunexuz-shell" });
        out.push({ kind: "out", text: "  143 ?        00:00:00 window-manager" });
        out.push({ kind: "out", text: "  200 pts/0    00:00:00 bash" });
        out.push({ kind: "out", text: "  201 pts/0    00:00:00 ps" });
        break;
      case "top":
        out.push({ kind: "out", text: "top - " + new Date().toLocaleTimeString() + " up 0 min, 1 user" });
        out.push({ kind: "out", text: "Tasks:   6 total,   1 running,   5 sleeping" });
        out.push({ kind: "out", text: `Mem:    ${Math.round((performance as any)?.memory?.usedJSHeapSize / 1024 / 1024 || 64)}MB used` });
        out.push({ kind: "out", text: "" });
        out.push({ kind: "out", text: "  PID  %CPU  %MEM    COMMAND" });
        out.push({ kind: "out", text: "  142  2.1   1.4    edunexuz-shell" });
        out.push({ kind: "out", text: "  143  1.8   1.2    window-manager" });
        out.push({ kind: "out", text: "  200  0.5   0.3    bash" });
        break;
      case "ping":
        if (!args[0]) { out.push({ kind: "out", text: "ping: usage error" }); break; }
        out.push({ kind: "out", text: `PING ${args[0]} (127.0.0.1) 56(84) bytes of data.` });
        for (let i = 0; i < 4; i++) {
          out.push({ kind: "out", text: `64 bytes from ${args[0]}: icmp_seq=${i + 1} ttl=64 time=${(Math.random() * 20 + 5).toFixed(1)} ms` });
        }
        out.push({ kind: "out", text: `--- ${args[0]} ping statistics ---` });
        out.push({ kind: "out", text: "4 packets transmitted, 4 received, 0% packet loss" });
        break;
      case "curl":
        if (!args[0]) { out.push({ kind: "out", text: "curl: no URL specified" }); break; }
        out.push({ kind: "out", text: `  % Total    % Received` });
        out.push({ kind: "out", text: `100  1256  100  1256    0     0  12560      0 --:--:-- --:--:-- --:--:-- 12560` });
        out.push({ kind: "out", text: `<!DOCTYPE html><html>...truncated...</html>` });
        break;
      case "python3":
      case "python":
        out.push({ kind: "out", text: "Python 3.12.0 (EduNexuZ Build)" });
        out.push({ kind: "out", text: 'Type "exit()" to quit.' });
        out.push({ kind: "out", text: ">>> (Python REPL not available in browser - use VS Code)" });
        break;
      case "node":
        out.push({ kind: "out", text: "Welcome to Node.js v22.0.0 (EduNexuZ)" });
        out.push({ kind: "out", text: "> (Node REPL not available in browser - use VS Code)" });
        break;
      case "apt":
        if (args[0] === "install") {
          out.push({ kind: "system", text: `Reading package lists... Done` });
          out.push({ kind: "system", text: `Building dependency tree... Done` });
          out.push({ kind: "system", text: `${args[1] || "package"} is already the newest version.` });
          out.push({ kind: "system", text: `0 upgraded, 0 newly installed, 0 to remove.` });
        } else {
          out.push({ kind: "out", text: "Usage: apt install <package>" });
        }
        break;
      case "sudo":
        if (args[0] === "rm" && args[1] === "-rf" && args[2] === "/") {
          out.push({ kind: "out", text: "Nice try 😏 — rm: cannot remove '/': ctOS protection active" });
        } else {
          out.push({ kind: "system", text: `[sudo] running: ${argStr}` });
        }
        break;
      case "cowsay": {
        const msg = argStr || "Moo!";
        const border = "─".repeat(msg.length + 2);
        out.push({ kind: "out", text: ` ┌${border}┐` });
        out.push({ kind: "out", text: ` │ ${msg} │` });
        out.push({ kind: "out", text: ` └${border}┘` });
        out.push({ kind: "out", text: "        \\   ^__^" });
        out.push({ kind: "out", text: "         \\  (oo)\\_______" });
        out.push({ kind: "out", text: "            (__)\\       )\\/\\" });
        out.push({ kind: "out", text: "                ||----w |" });
        out.push({ kind: "out", text: "                ||     ||" });
        break;
      }
      case "fortune":
        out.push({ kind: "out", text: fortunes[Math.floor(Math.random() * fortunes.length)] });
        break;
      case "matrix":
        out.push({ kind: "system", text: "Initiating matrix rain... (press any key to stop)" });
        out.push({ kind: "out", text: "01001000 01100101 01101100 01101100 01101111" });
        out.push({ kind: "out", text: "The Matrix has you... Follow the white rabbit. 🐇" });
        break;
      case "hack":
        out.push({ kind: "system", text: "[ ctOS ] INITIATING HACK SEQUENCE..." });
        out.push({ kind: "system", text: "[ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ] 100%" });
        out.push({ kind: "system", text: "[ OK ] Access point breached" });
        out.push({ kind: "system", text: "[ OK ] Firewall bypassed" });
        out.push({ kind: "system", text: "[ OK ] Root access obtained" });
        out.push({ kind: "out", text: "Just kidding 😄 — this is a portfolio site!" });
        break;
      case "theme":
        if (!args[0]) {
          out.push({ kind: "out", text: "usage: theme <ember|sunset|hearth|dune|forest|midnight|ctos|mocha>" });
        } else {
          window.dispatchEvent(new CustomEvent("edunexuz-set-theme", { detail: args[0] }));
          out.push({ kind: "system", text: `Theme set → ${args[0]}` });
        }
        break;
      case "open":
        if (!args[0]) {
          out.push({ kind: "out", text: "usage: open <firefox|vscode|terminal|settings|courses|classroom|community|profile>" });
        } else {
          window.dispatchEvent(new CustomEvent("edunexuz-open-window", { detail: args[0] }));
          out.push({ kind: "system", text: `Opening ${args[0]}...` });
        }
        break;
      case "exit":
        out.push({ kind: "system", text: "Closing terminal..." });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("edunexuz-close-window", { detail: "terminal" }));
        }, 500);
        break;
      default:
        out.push({ kind: "out", text: `bash: ${name}: command not found` });
        out.push({ kind: "out", text: `Type 'help' for available commands.` });
    }
    addLines([...out, { kind: "out", text: "" }]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx < 0) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= history.length) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Simple tab completion
      const partial = input.trim();
      const cmds = Object.keys(COMMANDS).concat(["ls", "cat", "cd", "pwd", "whoami", "hostname", "uname", "date", "echo", "clear", "cls", "neofetch", "history", "touch", "mkdir", "rm", "grep", "ps", "top", "ping", "curl", "python3", "node", "apt", "sudo", "cowsay", "fortune", "matrix", "hack", "theme", "open", "exit"]);
      const matches = cmds.filter((c) => c.startsWith(partial));
      if (matches.length === 1) setInput(matches[0] + " ");
    }
  }

  return (
    <Window id="terminal">
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="h-full overflow-auto p-4 font-mono text-[13px] leading-6 cursor-text"
        style={{
          background: "rgba(30, 20, 40, 0.95)",
          color: "#e8d5c0",
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === "in" ? "text-amber-400" :
              l.kind === "system" ? "text-cyan-400" :
              "text-gray-300"
            }
            style={{
              textShadow: l.kind === "in" ? "0 0 8px rgba(240,163,90,0.3)" :
                          l.kind === "system" ? "0 0 8px rgba(0,200,255,0.2)" : "none",
            }}
          >
            {l.text || "\u00a0"}
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
            setInput("");
          }}
          className="flex items-center gap-2"
        >
          <span className="text-amber-400 shrink-0" style={{ textShadow: "0 0 8px rgba(240,163,90,0.3)" }}>
            {PROMPT}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none caret-amber-400"
            style={{ color: "#e8d5c0" }}
          />
        </form>
      </div>
    </Window>
  );
}
