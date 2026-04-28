import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

export function attendanceRouter({ db }) {
  const r = express.Router();

  // PDF: POST /api/attendance/mark
  r.post("/mark", requireAuth, async (req, res) => {
    const bodySchema = z.object({ classId: z.union([z.string(), z.number()]) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const class_id = parseInt(String(parsed.data.classId), 10);
    const row = await db.markAttendance({ class_id, wallet: req.user.wallet });
    res.json({ attendance: row });
  });

  // PDF: GET /api/attendance/:classId
  r.get("/:classId", async (req, res) => {
    const rows = await db.getAttendanceByClass(req.params.classId);
    res.json({ attendance: rows });
  });

  return r;
}
