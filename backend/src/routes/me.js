import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

export function meRouter({ db }) {
  const r = express.Router();

  r.get("/", requireAuth, async (req, res) => {
    const wallet = req.user.wallet;
    const user = await db.getUserByWallet(wallet);
    if (!user) return res.status(404).json({ error: "not_found" });

    const profile = (await db.getProfile(wallet)) || {};
    const balance = await db.getTokenBalance(wallet);
    const attendanceCount = await db.getAttendanceCount(wallet);
    const communityMessages = await db.getCommunityMessageCount(wallet);

    res.json({
      user,
      profile,
      stats: {
        eduvTokens: balance,
        classesAttended: attendanceCount,
        communityMessages,
      },
    });
  });

  r.put("/profile", requireAuth, async (req, res) => {
    const wallet = req.user.wallet;
    const schema = z.object({
      bio: z.string().max(2000).optional(),
      role: z.string().max(50).optional(),
      location: z.string().max(120).optional(),
      avatar_seed: z.string().max(120).optional(),
      join_date: z.string().max(80).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const current = (await db.getProfile(wallet)) || {};
    const next = { ...current, ...parsed.data };
    const saved = await db.setProfile(wallet, next);
    res.json({ ok: true, profile: saved });
  });

  return r;
}
