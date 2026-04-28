import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import multer from "multer";

export function aiRouter({ db }) {
  const r = express.Router();

  const genAi = config.googleAiApiKey ? new GoogleGenerativeAI(config.googleAiApiKey) : null;
  const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  r.get("/health", async (_req, res) => {
    res.json({
      ok: true,
      tutorProvider: config.aiTutorProvider,
      voiceProvider: config.aiVoiceProvider,
      geminiConfigured: !!config.googleAiApiKey,
      openaiConfigured: !!config.openaiApiKey,
      ollama: { baseUrl: config.ollamaBaseUrl, model: config.ollamaModel },
    });
  });

  // Tutor: Gemini (cloud) or Gemma via Ollama (local)
  r.post("/tutor", requireAuth, async (req, res) => {
    const bodySchema = z.object({ prompt: z.string().min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    if (config.aiTutorProvider === "ollama") {
      try {
        const resp = await fetch(`${config.ollamaBaseUrl.replace(/\/$/, "")}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: config.ollamaModel, prompt: parsed.data.prompt, stream: false }),
        });
        if (!resp.ok) return res.status(502).json({ error: "ollama_unavailable" });
        const data = await resp.json();
        return res.json({ answer: data?.response || "" });
      } catch {
        return res.status(502).json({ error: "ollama_unavailable" });
      }
    }

    // default: gemini
    if (!genAi) {
      return res.status(501).json({ error: "gemini_not_configured" });
    }

    const model = genAi.getGenerativeModel({ model: config.googleAiModel });
    const result = await model.generateContent(parsed.data.prompt);
    const text = result?.response?.text?.() || "";
    return res.json({ answer: text });
  });

  // Multipart STT: POST /api/ai/voice/stt (field name: audio)
  r.post("/voice/stt", requireAuth, upload.single("audio"), async (req, res) => {
    if (config.aiVoiceProvider !== "openai") {
      return res.status(501).json({ error: "voice_provider_not_supported" });
    }
    if (!openai) {
      return res.status(501).json({ error: "openai_not_configured" });
    }
    if (!req.file) return res.status(400).json({ error: "missing_audio" });

    const file = new File([req.file.buffer], req.file.originalname || "audio.webm", {
      type: req.file.mimetype || "audio/webm",
    });
    const out = await openai.audio.transcriptions.create({
      file,
      model: config.openaiSttModel,
    });
    return res.json({ transcript: out.text });
  });

  // JSON TTS: POST /api/ai/voice/tts
  r.post("/voice/tts", requireAuth, async (req, res) => {
    if (config.aiVoiceProvider !== "openai") {
      return res.status(501).json({ error: "voice_provider_not_supported" });
    }
    if (!openai) {
      return res.status(501).json({ error: "openai_not_configured" });
    }

    const schema = z.object({ text: z.string().min(1).max(4000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const audio = await openai.audio.speech.create({
      model: config.openaiTtsModel,
      voice: config.openaiTtsVoice,
      input: parsed.data.text,
      format: "mp3",
    });
    const arr = Buffer.from(await audio.arrayBuffer());
    return res.json({
      audioBase64: arr.toString("base64"),
      audioMime: "audio/mpeg",
    });
  });

  // Backward-compatible JSON: POST /api/ai/voice { mode: stt|tts, ... }
  r.post("/voice", requireAuth, async (_req, res) => {
    if (config.aiVoiceProvider !== "openai") {
      return res.status(501).json({ error: "voice_provider_not_supported" });
    }
    if (!openai) {
      return res.status(501).json({ error: "openai_not_configured" });
    }

    const schema = z.object({
      mode: z.enum(["stt", "tts"]),
      audioBase64: z.string().optional(),
      audioMime: z.string().optional(),
      text: z.string().optional(),
    });

    const parsed = schema.safeParse(_req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    if (parsed.data.mode === "stt") {
      if (!parsed.data.audioBase64) return res.status(400).json({ error: "missing_audio" });
      const b = Buffer.from(parsed.data.audioBase64, "base64");
      const file = new File([b], "audio.webm", { type: parsed.data.audioMime || "audio/webm" });
      const out = await openai.audio.transcriptions.create({
        file,
        model: config.openaiSttModel,
      });
      return res.json({ transcript: out.text });
    }

    // tts
    if (!parsed.data.text) return res.status(400).json({ error: "missing_text" });
    const audio = await openai.audio.speech.create({
      model: config.openaiTtsModel,
      voice: config.openaiTtsVoice,
      input: parsed.data.text,
      format: "mp3",
    });
    const arr = Buffer.from(await audio.arrayBuffer());
    return res.json({
      audioBase64: arr.toString("base64"),
      audioMime: "audio/mpeg",
    });
  });

  r.post("/focus", requireAuth, async (req, res) => {
    const bodySchema = z.object({ focus_score: z.number().min(0).max(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    // store to json as content for now
    const rows = await db.getContent("focus_logs");
    const next = [...rows, { id: Date.now(), wallet: req.user.wallet, focus_score: parsed.data.focus_score, timestamp: new Date().toISOString() }];
    await db.setContent("focus_logs", next);

    res.json({ ok: true });
  });

  r.post("/quiz", requireAuth, async (req, res) => {
    const bodySchema = z.object({ topic: z.string().min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    res.json({
      quiz: {
        topic: parsed.data.topic,
        questions: [
          { q: `What is one key idea in ${parsed.data.topic}?`, choices: ["A", "B", "C", "D"], answer: 0 },
        ],
      },
    });
  });

  return r;
}
