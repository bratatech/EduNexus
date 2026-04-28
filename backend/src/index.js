import express from "express";
import cors from "cors";
import http from "node:http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { getPool } from "./db/pg.js";
import { ensureSchema } from "./db/migrate.js";
import { createDb } from "./db/adapter.js";
import { seedFromJson } from "./db/seed.js";

import { healthRouter } from "./routes/health.js";
import { usersRouter } from "./routes/users.js";
import { classesRouter } from "./routes/classes.js";
import { attendanceRouter } from "./routes/attendance.js";
import { tokensRouter } from "./routes/tokens.js";
import { aiRouter } from "./routes/ai.js";
import { enrollRouter } from "./routes/enroll.js";
import { contentRouter } from "./routes/content.js";
import { communityRouter } from "./routes/community.js";
import { realtimeRouter } from "./routes/realtime.js";
import { meRouter } from "./routes/me.js";
import { attachSocketServer } from "./realtime/socket.js";

const app = express();
app.disable("x-powered-by");

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

const pool = getPool(config.databaseUrl);
if (config.dbMode === "pg" && !pool) {
  throw new Error("DB_MODE=pg but DATABASE_URL is not set");
}
if (pool) {
  await ensureSchema(pool);
}

const db = createDb({ mode: config.dbMode, pool });

if (pool && db.mode === "pg" && config.seedFromJson) {
  await seedFromJson(pool);
}

app.get("/", (_req, res) => res.json({ ok: true }));
app.use("/api", healthRouter({ db }));

app.use("/api/users", usersRouter({ db }));
app.use("/api/classes", classesRouter({ db }));
app.use("/api/attendance", attendanceRouter({ db }));
app.use("/api/tokens", tokensRouter({ db }));
app.use("/api/ai", aiRouter({ db }));

app.use("/api/enroll", enrollRouter({ db }));
app.use("/api/content", contentRouter({ db }));
app.use("/api/community", communityRouter({ db }));
app.use("/api/realtime", realtimeRouter());
app.use("/api/me", meRouter({ db }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

const server = http.createServer(app);
attachSocketServer({ httpServer: server, config, db });

server.on("error", (err) => {
  if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
    console.error(`[backend] Failed to start: port ${config.port} is already in use.`);
    console.error(`[backend] Fix: stop the other process using ${config.port}, OR change PORT in backend/.env to a free port (e.g. 8081).`);
    process.exit(1);
  }
  console.error("[backend] Server error", err);
  process.exit(1);
});

server.listen(config.port, () => {
  console.log(`[backend] listening on :${config.port} (db=${db.mode})`);
});
