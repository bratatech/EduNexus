import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 8099;
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server_start_timeout")), 15000);
    proc.stdout.on("data", (buf) => {
      const s = buf.toString("utf8");
      console.log("[spawn stdout]", s);
      if (s.includes("listening")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.stderr.on("data", (buf) => {
      console.error("[spawn stderr]", buf.toString("utf8"));
    });
    proc.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`server_exited_${code}`));
    });
  });
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { res, data };
}

test("backend health and content endpoints", async () => {
  const proc = spawn(process.execPath, ["src/index.js"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, PORT: String(PORT), DB_MODE: "json" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer(proc);

    const h = await fetchJson(`${BASE}/api/health`);
    assert.equal(h.res.status, 200);
    assert.equal(h.data.ok, true);

    const programs = await fetchJson(`${BASE}/api/content/programs`);
    assert.equal(programs.res.status, 200);
    assert.ok(Array.isArray(programs.data.data));

    const subjects = await fetchJson(`${BASE}/api/content/subjects`);
    assert.equal(subjects.res.status, 200);
    assert.ok(Array.isArray(subjects.data.data));
  } finally {
    proc.kill();
  }
});
