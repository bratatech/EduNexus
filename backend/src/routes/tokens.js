import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

export function tokensRouter({ db }) {
  const r = express.Router();

  // PDF: POST /api/tokens/reward
  r.post("/reward", requireAuth, async (req, res) => {
    const bodySchema = z.object({
      amount: z.number().int(),
      tx_hash: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const row = await db.rewardTokens({ wallet: req.user.wallet, amount: parsed.data.amount, tx_hash: parsed.data.tx_hash });
    const balance = await db.getTokenBalance(req.user.wallet);
    res.json({ token: row, balance });
  });

  // PDF: GET /api/tokens/balance
  r.get("/balance", requireAuth, async (req, res) => {
    const balance = await db.getTokenBalance(req.user.wallet);
    res.json({ wallet: req.user.wallet, balance });
  });

  return r;
}
