import express from "express";
import { config } from "../config.js";

export function realtimeRouter() {
  const r = express.Router();

  r.get("/config", (_req, res) => {
    let iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    if (config.webrtcIceServersJson) {
      try {
        const parsed = JSON.parse(config.webrtcIceServersJson);
        if (Array.isArray(parsed) && parsed.length > 0) iceServers = parsed;
      } catch {}
    }

    res.json({
      ok: true,
      socketPath: config.socketPath,
      iceServers,
    });
  });

  return r;
}
