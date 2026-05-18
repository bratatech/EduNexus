import { execSync } from "node:child_process";

const port = Number(process.env.PORT || process.argv[2] || 8080);
if (!Number.isFinite(port)) process.exit(0);

try {
  if (process.platform === "win32") {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`[kill-port] Stopped PID ${pid} on port ${port}`);
      } catch { /* ignore */ }
    }
  } else {
    execSync(`lsof -ti :${port} | xargs -r kill -9`, { stdio: "ignore", shell: true });
  }
} catch {
  // port free
}
