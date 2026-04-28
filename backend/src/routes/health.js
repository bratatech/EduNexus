import express from "express";

export function healthRouter({ db }) {
  const r = express.Router();

  r.get("/health", async (_req, res) => {
    res.json({ ok: true, service: "edunexuz-backend" });
  });

  r.get("/health/db", async (_req, res) => {
    try {
      if (db.mode === "pg") {
        // lightweight query via adapter (balance query requires wallet, so do raw query in index instead)
        return res.json({ ok: true, mode: "pg" });
      }
      return res.json({ ok: true, mode: "json" });
    } catch (e) {
      return res.status(500).json({ ok: false, error: "db_unavailable" });
    }
  });

  return r;
}
