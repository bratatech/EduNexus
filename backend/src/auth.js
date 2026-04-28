import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function signToken(user) {
  return jwt.sign(
    { wallet: user.wallet, name: user.name || null, email: user.email || null },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const [, token] = hdr.split(" ");
  if (!token) return res.status(401).json({ error: "missing_token" });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
