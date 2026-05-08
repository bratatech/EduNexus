import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import multer from "multer";
import { randomUUID } from "node:crypto";

export function aiRouter({ db }) {
  const r = express.Router();

  function getGeminiClient() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || config.googleAiApiKey || "";
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }

  function getGeminiModelName() {
    return process.env.GOOGLE_AI_MODEL || config.googleAiModel || "gemini-1.5-flash";
  }

  function getGeminiModel() {
    const client = getGeminiClient();
    if (!client) return null;
    return client.getGenerativeModel({ model: getGeminiModelName() });
  }

  const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  async function getDocSummariesStore() {
    const rows = await db.getContent("document_summaries");
    return Array.isArray(rows) ? rows : [];
  }

  async function setDocSummariesStore(rows) {
    await db.setContent("document_summaries", rows);
  }

  function bufferToText(buf) {
    try {
      const asUtf8 = buf.toString("utf-8");
      if (asUtf8 && asUtf8.trim().length) return asUtf8;
    } catch {}
    return "";
  }

  async function summarizeWithGemini({ text, filename }) {
    const model = getGeminiModel();
    if (!model) {
      const err = new Error("gemini_not_configured");
      err.code = "gemini_not_configured";
      throw err;
    }

    const prompt =
      `You are an assistant that summarizes student-submitted documents.\n` +
      `Document filename: ${filename || "(unknown)"}\n\n` +
      `Return ONLY valid JSON (no markdown, no code fences) with this schema:\n` +
      `{\n` +
      `  "title": string,\n` +
      `  "summary": string,\n` +
      `  "highlightedNotes": [\n` +
      `    { "note": string, "importance": "high"|"medium"|"low" }\n` +
      `  ]\n` +
      `}\n\n` +
      `Write a clear, student-friendly summary (5-12 sentences).\n` +
      `Include 6-12 highlightedNotes focusing on definitions, key formulas, steps, and pitfalls.\n\n` +
      `Document text:\n` +
      text;

    const result = await model.generateContent(prompt);
    const out = result?.response?.text?.() || "";
    let parsed;
    try {
      parsed = JSON.parse(out);
    } catch {
      return {
        title: filename || "Document Summary",
        summary: out,
        highlightedNotes: [],
      };
    }

    const schema = z.object({
      title: z.string().min(1).catch(filename || "Document Summary"),
      summary: z.string().min(1),
      highlightedNotes: z
        .array(z.object({ note: z.string().min(1), importance: z.enum(["high", "medium", "low"]).catch("medium") }))
        .catch([]),
    });
    const safe = schema.safeParse(parsed);
    if (!safe.success) {
      return {
        title: filename || "Document Summary",
        summary: out,
        highlightedNotes: [],
      };
    }
    return safe.data;
  }

  r.get("/health", async (_req, res) => {
    const geminiModel = getGeminiModelName();
    res.json({
      ok: true,
      tutorProvider: config.aiTutorProvider,
      voiceProvider: config.aiVoiceProvider,
      geminiConfigured: !!(process.env.GOOGLE_AI_API_KEY || config.googleAiApiKey),
      openaiConfigured: !!config.openaiApiKey,
      geminiModel,
      ollama: { baseUrl: config.ollamaBaseUrl, model: config.ollamaModel },
    });
  });

  r.get("/documents", requireAuth, async (req, res) => {
    const rows = await getDocSummariesStore();
    const mine = rows
      .filter((x) => x && typeof x === "object" && x.wallet === req.user.wallet)
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    res.json({ data: mine });
  });

  r.get("/documents/:id", requireAuth, async (req, res) => {
    const rows = await getDocSummariesStore();
    const row = rows.find((x) => x && typeof x === "object" && x.id === req.params.id);
    if (!row) return res.status(404).json({ error: "not_found" });
    if (row.wallet !== req.user.wallet) return res.status(403).json({ error: "forbidden" });
    res.json({ data: row });
  });

  r.post("/documents/summarize", requireAuth, upload.single("document"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "missing_document" });

    const metaSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      classroomId: z.string().min(1).max(100).optional(),
    });
    const metaParsed = metaSchema.safeParse(req.body || {});
    if (!metaParsed.success) return res.status(400).json({ error: "invalid_body" });

    const filename = req.file.originalname || "document";
    const rawText = bufferToText(req.file.buffer);
    if (!rawText || rawText.trim().length < 10) return res.status(400).json({ error: "document_text_unreadable" });

    let summary;
    try {
      summary = await summarizeWithGemini({ text: rawText.slice(0, 120_000), filename });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "gemini_not_configured") {
        return res.status(501).json({ error: "gemini_not_configured" });
      }
      throw e;
    }

    const rows = await getDocSummariesStore();
    const row = {
      id: randomUUID(),
      wallet: req.user.wallet,
      filename,
      mimetype: req.file.mimetype || "application/octet-stream",
      title: metaParsed.data.title || summary.title || filename,
      classroom_id: metaParsed.data.classroomId || null,
      created_at: new Date().toISOString(),
      summary: summary.summary,
      highlighted_notes: summary.highlightedNotes,
    };
    const next = [row, ...rows];
    await setDocSummariesStore(next);

    res.json({ ok: true, data: row });
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
    const model = getGeminiModel();
    if (!model) {
      return res.status(501).json({ error: "gemini_not_configured" });
    }

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
