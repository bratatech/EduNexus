import express from "express";
import { z } from "zod";

export function enrollRouter({ db }) {
  const r = express.Router();

  r.post("/", async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional().nullable(),
      level: z.string().optional().nullable(),
      subjects: z.array(z.string()).default([]),
      format: z.string().optional().nullable(),
      message: z.string().optional().nullable(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const row = await db.createEnrollRequest(parsed.data);
    res.json({ ok: true, request: row });
  });

  return r;
}
