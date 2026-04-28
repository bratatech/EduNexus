import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

export function communityRouter({ db }) {
  const r = express.Router();

  r.get("/channels", async (_req, res) => {
    const data = await db.getContent("community_channels");
    res.json({ data });
  });

  r.get("/users", async (_req, res) => {
    const data = await db.getContent("community_users");
    res.json({ data });
  });

  r.get("/messages/:channelId", async (req, res) => {
    const all = await db.getContent("community_messages");
    res.json({ data: all?.[req.params.channelId] || [] });
  });

  r.post("/messages/:channelId", requireAuth, async (req, res) => {
    const schema = z.object({
      text: z.string().min(1).max(4000),
      type: z.enum(["text", "image", "gif", "video", "code", "system"]).default("text"),
      mediaUrl: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    if (parsed.data.mediaUrl) {
      try {
        const u = new URL(parsed.data.mediaUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          return res.status(400).json({ error: "invalid_media_url" });
        }
      } catch {
        return res.status(400).json({ error: "invalid_media_url" });
      }
    }

    const all = (await db.getContent("community_messages")) || {};
    const list = Array.isArray(all[req.params.channelId]) ? all[req.params.channelId] : [];

    const msg = {
      id: Date.now(),
      user: req.user.wallet,
      avatar: "😎",
      text: parsed.data.text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: parsed.data.type,
      mediaUrl: parsed.data.mediaUrl,
    };

    const next = { ...all, [req.params.channelId]: [...list, msg].slice(-500) };
    await db.setContent("community_messages", next);

    res.json({ ok: true, message: msg });
  });

  r.post("/reactions/:channelId/:messageId", requireAuth, async (req, res) => {
    const schema = z.object({ emoji: z.string().min(1).max(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const all = (await db.getContent("community_messages")) || {};
    const list = Array.isArray(all[req.params.channelId]) ? all[req.params.channelId] : [];

    const messageId = parseInt(req.params.messageId, 10);
    const updated = list.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = Array.isArray(m.reactions) ? m.reactions : [];
      const existing = reactions.find((r) => r.emoji === parsed.data.emoji);
      if (existing) {
        return {
          ...m,
          reactions: reactions.map((r) => (r.emoji === parsed.data.emoji ? { ...r, count: (r.count || 0) + 1 } : r)),
        };
      }
      return { ...m, reactions: [...reactions, { emoji: parsed.data.emoji, count: 1 }] };
    });

    const next = { ...all, [req.params.channelId]: updated };
    await db.setContent("community_messages", next);

    res.json({ ok: true });
  });

  return r;
}
