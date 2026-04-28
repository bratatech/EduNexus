import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

export function classesRouter({ db }) {
  const r = express.Router();

  // PDF: POST /api/classes/create
  r.post("/create", requireAuth, async (req, res) => {
    const bodySchema = z.object({
      title: z.string().min(1),
      ipfs_hash: z.string().min(1).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const row = await db.createClass({
      teacher_wallet: req.user.wallet,
      title: parsed.data.title,
      ipfs_hash: parsed.data.ipfs_hash || null,
    });
    res.json({ class: row });
  });

  // PDF: GET /api/classes
  r.get("/", async (_req, res) => {
    const rows = await db.listClasses();
    res.json({ classes: rows });
  });

  return r;
}
