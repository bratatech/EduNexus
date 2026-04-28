import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { signToken, requireAuth } from "../auth.js";

export function usersRouter({ db }) {
  const r = express.Router();

  // PDF route: POST /api/users/register
  r.post("/register", async (req, res) => {
    const bodySchema = z.object({
      wallet: z.string().min(3),
      name: z.string().min(1),
      email: z.string().email().optional(),
      password: z.string().min(4),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const { wallet, name, email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.upsertUser({ wallet, name, email: email || null, passwordHash });
    const token = signToken({ wallet, name, email: email || null });
    res.json({ user, token });
  });

  // login (needed by current UI)
  r.post("/login", async (req, res) => {
    const bodySchema = z.object({ wallet: z.string().min(3), password: z.string().min(4) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const { wallet, password } = parsed.data;
    const user = await db.getUserWithPassword(wallet);
    if (!user || !user.password_hash) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const safe = await db.getUserByWallet(wallet);
    const token = signToken({ wallet: safe.wallet, name: safe.name, email: safe.email });
    res.json({ user: safe, token });
  });

  // PDF route: GET /api/users/:wallet
  r.get("/:wallet", async (req, res) => {
    const user = await db.getUserByWallet(req.params.wallet);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({ user });
  });

  // profile update (frontend has editable profile)
  r.put("/:wallet", requireAuth, async (req, res) => {
    if (req.user.wallet !== req.params.wallet) return res.status(403).json({ error: "forbidden" });

    const bodySchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const current = await db.getUserWithPassword(req.params.wallet);
    if (!current) return res.status(404).json({ error: "not_found" });

    const user = await db.upsertUser({
      wallet: req.params.wallet,
      name: parsed.data.name ?? current.name,
      email: parsed.data.email ?? current.email,
      passwordHash: null,
    });

    res.json({ user });
  });

  return r;
}
