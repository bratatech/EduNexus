import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import multer from "multer";
import { randomUUID } from "node:crypto";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import dotenv from "dotenv";
dotenv.config();

export function aiRouter({ db }) {
  const r = express.Router();

  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  function getGeminiClient() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || config.googleAiApiKey || "";
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }

  function getGeminiModelName() {
    const wanted = process.env.GOOGLE_AI_MODEL || config.googleAiModel || "";
    const fallback = "gemini-2.5-flash";
    const model = String(wanted || fallback).trim();

    // The @google/generative-ai SDK uses the v1beta endpoint. Some model names may exist
    // in other API versions but not in v1beta/generateContent. Ensure we don't crash on startup.
    if (/^gemini-3\./i.test(model)) return fallback;
    return model || fallback;
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

  function bufferToUtf8Text(buf) {
    try {
      const asUtf8 = buf.toString("utf-8");
      if (asUtf8 && asUtf8.trim().length) return asUtf8;
    } catch {}
    return "";
  }

  async function extractDocumentText({ buffer, mimetype, filename }) {
    const mt = String(mimetype || "").toLowerCase();
    const name = String(filename || "").toLowerCase();

    // TXT-like
    if (mt.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
      return bufferToUtf8Text(buffer);
    }

    // PDF
    if (mt === "application/pdf" || name.endsWith(".pdf")) {
      try {
        const out = await pdfParse(buffer);
        return String(out?.text || "").trim();
      } catch {
        return "";
      }
    }

    // DOCX
    if (
      mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      try {
        const out = await mammoth.extractRawText({ buffer });
        return String(out?.value || "").trim();
      } catch {
        return "";
      }
    }

    // Fallback attempt
    return bufferToUtf8Text(buffer);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, reject) => {
      t = setTimeout(() => reject(new Error("timeout")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
  }

  function isRetriableGeminiError(e) {
    if (!e || typeof e !== "object") return false;
    if (!("status" in e)) return false;
    const s = Number(e.status);
    return s === 429 || s === 503;
  }

  async function generateWithGeminiRetry({ model, prompt, parts, retries = 2 }) {
    const content = parts || prompt;
    let attempt = 0;
    // total attempts = retries + 1
    // backoff: 500ms, 1200ms, 2500ms
    const backoffMs = [500, 1200, 2500];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const result = await model.generateContent(content);
        return result?.response?.text?.() || "";
      } catch (e) {
        if (attempt >= retries || !isRetriableGeminiError(e)) throw e;
        const wait = backoffMs[Math.min(attempt, backoffMs.length - 1)] || 800;
        await sleep(wait);
        attempt += 1;
      }
    }
  }

  function normalizeYoutubeWatchUrl(videoUrl) {
    let cleanUrl = String(videoUrl || "").trim();
    cleanUrl = cleanUrl.replace(/^https?:\/\/youtu\.be\/([^?]+)(\?.*)?$/, "https://www.youtube.com/watch?v=$1");
    cleanUrl = cleanUrl.replace(/^https?:\/\/www\.youtube\.com\/embed\/([^?]+)(\?.*)?$/, "https://www.youtube.com/watch?v=$1");
    try {
      const u = new URL(cleanUrl);
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/watch?v=${v}`;
    } catch { /* leave as-is */ }
    return cleanUrl;
  }

  function findLectureNotesRow(rows, wallet, videoId, topicId) {
    if (!videoId) return null;
    return (
      rows.find(
        (x) =>
          x &&
          typeof x === "object" &&
          x.wallet === wallet &&
          x.source_type === "lecture_video" &&
          x.video_id === videoId &&
          (!topicId || x.topic_id === topicId)
      ) || null
    );
  }

  /** Clean and structure plain-text summary for display (no JSON/markdown debris). */
  function formatLectureSummaryText(summary) {
    let s = stripCodeFences(String(summary || "")).trim();
    if (s.startsWith("{") || s.includes('"highlightedNotes"') || s.includes('"summary"')) {
      try {
        const inner = JSON.parse(extractFirstJsonObject(s) || s);
        if (typeof inner.summary === "string") s = inner.summary.trim();
      } catch { /* keep s */ }
    }
    s = s
      .replace(/\r\n/g, "\n")
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/^\s*\{\s*"title"\s*:[\s\S]*$/im, "")
      .trim();

    const sectionNames = [
      "Overview",
      "Key Concepts",
      "Key Concepts and Definitions",
      "How It Works",
      "Process and Steps",
      "Examples",
      "Common Misconceptions",
      "Concept Connections",
      "Timeline",
      "Lecture Flow",
      "Timeline / Lecture Flow",
      "Quick Self-Check",
      "Glossary",
    ];
    for (const name of sectionNames) {
      const re = new RegExp(`(^|\\n)\\s*(${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*:?\\s*`, "gi");
      s = s.replace(re, `\n\n$2\n`);
    }

    const lines = s.split("\n").map((line) => {
      let t = line.trimEnd();
      const trimmed = t.trim();
      if (!trimmed) return "";
      if (/^[-•*]\s+/.test(trimmed)) return `- ${trimmed.replace(/^[-•*]\s+/, "")}`;
      if (/^\d+\.\s+/.test(trimmed)) return `- ${trimmed.replace(/^\d+\.\s+/, "")}`;
      if (/^(definition|intuition|why it matters|example|common confusion|formula|step)\s*:/i.test(trimmed)) {
        return `  - ${trimmed}`;
      }
      if (/^concept\s*:\s*/i.test(trimmed)) return `\n${trimmed}`;
      return trimmed;
    });

    s = lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return s;
  }

  function buildLectureNotesPrompt({ cleanUrl, reqTitle, topicTitle, topicDescription, videoDescription, regenerate = false }) {
    const ctx = [
      topicTitle ? `Course topic: ${topicTitle}` : "",
      topicDescription ? `Topic overview: ${topicDescription}` : "",
      videoDescription ? `Lecture focus: ${videoDescription}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return (
      `You are an expert academic note-taker and university teaching assistant.\n` +
      `Watch and analyse the attached YouTube lecture video.\n` +
      `Video URL: ${cleanUrl}\n` +
      (ctx ? `${ctx}\n` : "") +
      `${regenerate ? "\nREGENERATE: Produce fresh, improved notes (deeper detail than a prior draft). Do not repeat generic filler.\n" : ""}` +
      `\nGenerate VERY detailed, structured, and elaborate class notes from the actual lecture content.\n` +
      `Base every section on what is taught in the video — do not invent unrelated material.\n\n` +
      `Return ONLY valid JSON (no markdown, no code fences) with this schema:\n` +
      `{\n` +
      `  "title": string,\n` +
      `  "summary": string,\n` +
      `  "highlightedNotes": [\n` +
      `    { "note": string, "importance": "high"|"medium"|"low" }\n` +
      `  ]\n` +
      `}\n\n` +
      `Requirements for "summary" (plain text inside the JSON string):\n` +
      `- Use EXACTLY these section headings on their own line (no # symbols): Overview, Key Concepts, How It Works, Examples, Common Misconceptions, Concept Connections, Timeline / Lecture Flow, Quick Self-Check, Glossary.\n` +
      `- Under Key Concepts, for EACH concept use this pattern:\n` +
      `  Concept: <name>\n` +
      `  - Definition: <1-2 sentences>\n` +
      `  - Intuition: <mental model>\n` +
      `  - Why it matters: <exam/real-world relevance>\n` +
      `  - Example: <short concrete example>\n` +
      `  - Common confusion: <one pitfall>\n` +
      `- Cover AT LEAST 12 concepts from the lecture using the lecturer's terms.\n` +
      `- Use "- " bullets only (no numbered lists in summary).\n` +
      `- Target 1600-2400 words. Be elaborate and explainable — a student should understand without rewatching.\n` +
      `- NEVER put JSON, braces, or "highlightedNotes" inside summary.\n` +
      `- No markdown (#, **, __, code fences).\n` +
      `- Quick Self-Check: exactly 5 questions as bullets.\n` +
      `- Glossary: at least 12 terms, each as "- Term: definition".\n\n` +
      `Requirements for "highlightedNotes" (REQUIRED — minimum 18 items):\n` +
      `- One complete sentence per item; specific to this lecture (not generic study tips).\n` +
      `- high = core idea/formula/theorem, medium = supporting detail, low = context/tip.\n` +
      `- Do NOT leave highlightedNotes empty.\n\n` +
      `CRITICAL: Return raw JSON only. Do NOT wrap the response in markdown code fences.\n` +
      `Lecture title hint: ${reqTitle || "(none provided)"}`
    );
  }

  async function generateLectureNotesWithGemini({
    model,
    cleanUrl,
    reqTitle,
    topicTitle,
    topicDescription,
    videoDescription,
    regenerate = false,
  }) {
    const notePrompt = buildLectureNotesPrompt({
      cleanUrl,
      reqTitle,
      topicTitle,
      topicDescription,
      videoDescription,
      regenerate,
    });
    const lectureTimeoutMs = Number(process.env.AI_LECTURE_NOTES_TIMEOUT_MS || 240_000);
    const videoParts = [
      { fileData: { mimeType: "video/*", fileUri: cleanUrl } },
      { text: notePrompt },
    ];

    try {
      return await withTimeout(
        generateWithGeminiRetry({ model, parts: videoParts, retries: 1 }),
        lectureTimeoutMs
      );
    } catch (videoErr) {
      const isTimeout = videoErr && typeof videoErr === "object" && "message" in videoErr && videoErr.message === "timeout";
      console.warn(
        "[ai/lecture-notes] Video analysis failed, falling back to text:",
        isTimeout ? "timeout" : videoErr?.message || videoErr
      );
      const textPrompt =
        notePrompt +
        `\n\nIf you cannot watch the video, infer the topic from the URL/video id and still produce comprehensive notes.`;
      return await withTimeout(
        generateWithGeminiRetry({ model, prompt: textPrompt, retries: 2 }),
        Math.min(lectureTimeoutMs, 90_000)
      );
    }
  }

  async function parseLectureNotesJson({ out, model, reqTitle, filename }) {
    const cleaned = stripCodeFences(out);
    let parsed2;
    try {
      parsed2 = JSON.parse(cleaned);
    } catch {
      const extracted = extractFirstJsonObject(cleaned);
      if (extracted) {
        try { parsed2 = JSON.parse(extracted); } catch { parsed2 = null; }
      }
      if (!parsed2) {
        try {
          const repaired = await summarizeRepairJson({ model, badText: out, filename: filename || "Lecture Notes" });
          const repairedExtracted = extractFirstJsonObject(repaired) || repaired;
          parsed2 = JSON.parse(repairedExtracted);
        } catch {
          parsed2 = {
            title: reqTitle || "Lecture Notes",
            summary: typeof out === "string" ? out : String(out || ""),
            highlightedNotes: [],
          };
        }
      }
    }

    const schema = z.object({
      title: z.string().min(1).catch(reqTitle || "Lecture Notes"),
      summary: z.string().min(1),
      highlightedNotes: z
        .array(z.object({ note: z.string().min(1), importance: z.enum(["high", "medium", "low"]).catch("medium") }))
        .catch([]),
    });
    const safe = schema.safeParse(parsed2);
    if (!safe.success) {
      return finalizeLectureNotes(
        {
          title: reqTitle || "Lecture Notes",
          summary: typeof out === "string" ? out : String(out || ""),
          highlightedNotes: [],
        },
        reqTitle
      );
    }
    return finalizeLectureNotes(safe.data, reqTitle);
  }

  function stripCodeFences(text) {
    return String(text || "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
  }

  function extractHighlightsFromSummary(summary) {
    const lines = String(summary || "")
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const bullets = lines.filter((l) => /^[-•*]\s+/.test(l) || /^\d+\.\s+/.test(l));
    return bullets.slice(0, 22).map((line, i) => ({
      note: line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim(),
      importance: i < 8 ? "high" : i < 15 ? "medium" : "low",
    }));
  }

  /** Convert model output into human-readable plain text + highlight list. */
  function finalizeLectureNotes(raw, reqTitle) {
    let title = String(raw?.title || reqTitle || "Lecture Notes").trim();
    let summary = String(raw?.summary || "").trim();
    let highlightedNotes = Array.isArray(raw?.highlightedNotes)
      ? raw.highlightedNotes
      : Array.isArray(raw?.highlighted_notes)
        ? raw.highlighted_notes
        : [];

    const unwrapSummaryJson = () => {
      const blob = extractFirstJsonObject(summary) || stripCodeFences(summary);
      if (!blob.startsWith("{")) return false;
      try {
        const inner = JSON.parse(blob);
        if (typeof inner.summary === "string" && inner.summary.trim()) summary = inner.summary.trim();
        if (typeof inner.title === "string" && inner.title.trim()) title = inner.title.trim();
        const hl = inner.highlightedNotes || inner.highlighted_notes;
        if (Array.isArray(hl) && hl.length) highlightedNotes = hl;
        return true;
      } catch {
        return false;
      }
    };

    if (summary.startsWith("{") || summary.includes('"highlightedNotes"') || summary.includes('"summary"')) {
      unwrapSummaryJson();
    }

    summary = formatLectureSummaryText(summary);

    highlightedNotes = highlightedNotes
      .map((n) => ({
        note: String(n?.note || n?.text || "").trim(),
        importance: ["high", "medium", "low"].includes(n?.importance) ? n.importance : "medium",
      }))
      .filter((n) => n.note.length > 0);

    if (highlightedNotes.length < 10 && summary.length > 300) {
      const derived = extractHighlightsFromSummary(summary);
      if (derived.length > highlightedNotes.length) highlightedNotes = derived;
    }

    // Pull extra highlights from concept definitions if still sparse
    if (highlightedNotes.length < 12) {
      const conceptLines = summary
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^- (Definition|Intuition|Why it matters):/i.test(l))
        .slice(0, 8);
      for (const line of conceptLines) {
        const note = line.replace(/^-\s*/, "").trim();
        if (note.length > 20 && !highlightedNotes.some((h) => h.note === note)) {
          highlightedNotes.push({ note, importance: "medium" });
        }
      }
    }

    return { title, summary, highlightedNotes };
  }

  function extractFirstJsonObject(text) {
    const s = stripCodeFences(text);
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return "";
    return s.slice(first, last + 1);
  }

  async function summarizeRepairJson({ model, badText, filename }) {
    const repairPrompt =
      `Fix the following response into ONLY valid JSON (no markdown, no code fences) that matches this schema:\n` +
      `{\n` +
      `  "title": string,\n` +
      `  "summary": string,\n` +
      `  "highlightedNotes": [ { "note": string, "importance": "high"|"medium"|"low" } ]\n` +
      `}\n\n` +
      `Rules:\n` +
      `- Keep summary as professional-grade, human-readable study notes (headings + bullet points + short explanations).\n` +
      `- Make it explainable: include brief "why" / "how" explanations, not just labels.\n` +
      `- Include at least 8 key concepts, each with definition + intuition + example.\n` +
      `- Include a short Glossary section and a Concept connections section.\n` +
      `- Target 700-1400 words unless the document is very small.\n` +
      `- IMPORTANT formatting: summary MUST be plain text. Do NOT use markdown symbols like #, **, __, or code fences.\n` +
      `  Use simple headings like "Overview" and bullet points like "- item" only.\n` +
      `- Do not include JSON inside the summary.\n` +
      `- If title is missing, use: ${filename || "Document Summary"}\n\n` +
      `Bad response to repair:\n` +
      String(badText || "");

    return await generateWithGeminiRetry({ model, prompt: repairPrompt, retries: 1 });
  }

  async function summarizeWithGemini({ text, filename }) {
    const model = getGeminiModel();
    if (!model) {
      const err = new Error("gemini_not_configured");
      err.code = "gemini_not_configured";
      throw err;
    }

    const prompt =
      `You are an expert study assistant who creates high-quality, exam-oriented notes from student-submitted documents.\n` +
      `Document filename: ${filename || "(unknown)"}\n\n` +
      `Return ONLY valid JSON (no markdown, no code fences) with this schema:\n` +
      `{\n` +
      `  "title": string,\n` +
      `  "summary": string,\n` +
      `  "highlightedNotes": [\n` +
      `    { "note": string, "importance": "high"|"medium"|"low" }\n` +
      `  ]\n` +
      `}\n\n` +
      `Requirements:\n` +
      `- "summary" must be professional-grade, explainable STUDY NOTES (not a paragraph dump).\n` +
      `- Provide detailed but clear explanations: for each key concept, include a short 2-5 sentence explanation (what it is, why it matters, how it works).\n` +
      `- Depth requirement: identify and explain at least 8-12 key concepts from the document (unless the document is extremely short).\n` +
      `  For each concept include:\n` +
      `  - Definition (1-2 lines)\n` +
      `  - Intuition (the "mental model" / why it works)\n` +
      `  - Why it matters (exam relevance / real-world use)\n` +
      `  - Mini example (1-3 lines)\n` +
      `  - Common confusion (1 bullet)\n` +
      `- Prefer concrete, precise statements; avoid generic filler.\n` +
      `- Use short headings, bullet points, and occasional short paragraphs for explanations.\n` +
      `- Target length: 900-1700 words unless the document is very small.\n` +
      `- IMPORTANT formatting: summary MUST be plain text. Do NOT use markdown symbols like #, **, __, or code fences.\n` +
      `  Use headings like "Overview" / "Key concepts & definitions" and bullets like "- ..." only.\n` +
      `- Recommended structure (use headings exactly like these when relevant):\n` +
      `  1) Overview (2-4 bullets)\n` +
      `  2) Key concepts & definitions (each concept: definition + explanation + 1 tiny example if possible)\n` +
      `  3) How it works / Process / Steps (step-by-step with rationale)\n` +
      `  4) Examples / Applications (worked or realistic examples)\n` +
      `  5) Pitfalls / Common mistakes (what students usually get wrong and how to avoid it)\n` +
      `  6) Quick self-check (3-6 short questions students should be able to answer)\n` +
      `  7) Glossary (8-15 terms: term — simple meaning)\n` +
      `  8) Concept connections (3-6 bullets showing how the concepts relate; e.g., "A -> enables B", "C is a special case of D")\n` +
      `- If the document contains formulas, include them and explain each symbol.\n` +
      `- If the document is code/CS-related, include complexity/edge cases when relevant.\n` +
      `- "highlightedNotes" must be 12-20 items; each note should be 1 sentence max.\n` +
      `- Mark importance:\n` +
      `  - high: core definitions/formulas/main results\n` +
      `  - medium: key supporting points/steps\n` +
      `  - low: extra tips/context\n\n` +
      `Document text:\n` +
      text;

    let out = "";
    try {
      out = await generateWithGeminiRetry({ model, prompt, retries: 2 });
    } catch (e) {
      // If the configured model doesn't exist for v1beta/generateContent, retry with fallback.
      if (e && typeof e === "object" && "status" in e && e.status === 404) {
        const fallbackModel = getGeminiClient()?.getGenerativeModel({ model: "gemini-2.5-flash" }) || null;
        if (!fallbackModel) throw e;
        out = await generateWithGeminiRetry({ model: fallbackModel, prompt, retries: 2 });
      } else if (isRetriableGeminiError(e)) {
        const err = new Error("gemini_busy");
        err.code = "gemini_busy";
        throw err;
      } else {
        throw e;
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(out);
    } catch {
      const extracted = extractFirstJsonObject(out);
      if (extracted) {
        try {
          parsed = JSON.parse(extracted);
        } catch {
          parsed = null;
        }
      }
      if (!parsed) {
        try {
          const repaired = await summarizeRepairJson({ model, badText: out, filename });
          const repairedExtracted = extractFirstJsonObject(repaired) || repaired;
          parsed = JSON.parse(repairedExtracted);
        } catch {
          return {
            title: filename || "Document Summary",
            summary: typeof out === "string" ? out : String(out || ""),
            highlightedNotes: [],
          };
        }
      }
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

  r.get("/health", asyncHandler(async (_req, res) => {
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
  }));

  r.get("/documents", requireAuth, asyncHandler(async (req, res) => {
    const rows = await getDocSummariesStore();
    const mine = rows
      .filter((x) => x && typeof x === "object" && x.wallet === req.user.wallet)
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    res.json({ data: mine });
  }));

  r.get("/documents/:id", requireAuth, asyncHandler(async (req, res) => {
    const rows = await getDocSummariesStore();
    const row = rows.find((x) => x && typeof x === "object" && x.id === req.params.id);
    if (!row) return res.status(404).json({ error: "not_found" });
    if (row.wallet !== req.user.wallet) return res.status(403).json({ error: "forbidden" });
    res.json({ data: row });
  }));

  r.post("/documents/summarize", requireAuth, upload.single("document"), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "missing_document" });

    const metaSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      classroomId: z.string().min(1).max(100).optional(),
    });
    const metaParsed = metaSchema.safeParse(req.body || {});
    if (!metaParsed.success) return res.status(400).json({ error: "invalid_body" });

    const filename = req.file.originalname || "document";
    const rawText = await extractDocumentText({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      filename,
    });
    if (!rawText || rawText.trim().length < 10) return res.status(400).json({ error: "document_text_unreadable" });

    let summary;
    try {
      summary = await summarizeWithGemini({ text: rawText.slice(0, 120_000), filename });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "gemini_not_configured") {
        return res.status(501).json({ error: "gemini_not_configured" });
      }
      if (e && typeof e === "object" && "code" in e && e.code === "gemini_busy") {
        return res.status(503).json({ error: "gemini_busy" });
      }
      if (isRetriableGeminiError(e)) {
        return res.status(503).json({ error: "gemini_busy" });
      }
      console.error("[ai/documents/summarize] Gemini error:", e?.message || e);
      return res.status(502).json({ error: "gemini_unavailable", detail: String(e?.message || "").slice(0, 200) });
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
  }));

  // Tutor: Gemini (cloud) or Gemma via Ollama (local)
  r.post("/tutor", requireAuth, asyncHandler(async (req, res) => {
    const bodySchema = z.object({ prompt: z.string().min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const userPrompt = parsed.data.prompt.trim();
    const tutorPrompt =
      `You are EduNexuZ AI Tutor, a production-grade teaching assistant.\n` +
      `Your goal: help the student deeply understand the topic, not just give a short answer.\n\n` +
      `Output rules (IMPORTANT):\n` +
      `- Output MUST be plain text (no markdown headings like #/###, no code fences).\n` +
      `- Use simple section labels like "Answer", "Explanation", "Example", "Steps", "Common mistakes", "Quick check".\n` +
      `- Prefer bullet points with "- ".\n` +
      `- Be precise and professional. Avoid filler.\n\n` +
      `Teaching requirements:\n` +
      `- First give a direct answer in 2-5 lines.\n` +
      `- Then explain the concept in detail (the "why" and "how").\n` +
      `- Provide at least 1 concrete example.\n` +
      `- Add common mistakes/pitfalls and how to avoid them.\n` +
      `- Add 3 short "Quick check" questions at the end.\n\n` +
      `Student question:\n` +
      userPrompt;

    if (config.aiTutorProvider === "ollama") {
      try {
        const resp = await withTimeout(
          fetch(`${config.ollamaBaseUrl.replace(/\/$/, "")}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: config.ollamaModel, prompt: tutorPrompt, stream: false }),
          }),
          Number(process.env.AI_TUTOR_TIMEOUT_MS || 25_000)
        );
        if (!resp.ok) return res.status(502).json({ error: "ollama_unavailable" });
        const data = await resp.json();
        return res.json({ answer: String(data?.response || "").trim() });
      } catch {
        return res.status(502).json({ error: "ollama_unavailable" });
      }
    }

    // default: gemini
    const model = getGeminiModel();
    if (!model) {
      return res.status(501).json({ error: "gemini_not_configured" });
    }

    let text = "";
    try {
      text = await withTimeout(
        generateWithGeminiRetry({ model, prompt: tutorPrompt, retries: 2 }),
        Number(process.env.AI_TUTOR_TIMEOUT_MS || 25_000)
      );
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 404) {
        const fallbackModel = getGeminiClient()?.getGenerativeModel({ model: "gemini-2.5-flash" }) || null;
        if (!fallbackModel) return res.status(502).json({ error: "gemini_model_not_supported" });
        try {
          text = await withTimeout(
            generateWithGeminiRetry({ model: fallbackModel, prompt: tutorPrompt, retries: 2 }),
            Number(process.env.AI_TUTOR_TIMEOUT_MS || 25_000)
          );
        } catch (fallbackErr) {
          console.error("[ai/tutor] Gemini fallback also failed:", fallbackErr?.message || fallbackErr);
          if (isRetriableGeminiError(fallbackErr)) return res.status(503).json({ error: "gemini_busy" });
          return res.status(502).json({ error: "gemini_unavailable", detail: String(fallbackErr?.message || "").slice(0, 200) });
        }
      } else {
        if (e && typeof e === "object" && "message" in e && e.message === "timeout") {
          return res.status(504).json({ error: "ai_timeout" });
        }
        console.error("[ai/tutor] Gemini error:", e?.message || e);
        if (isRetriableGeminiError(e)) return res.status(503).json({ error: "gemini_busy" });
        return res.status(502).json({ error: "gemini_unavailable", detail: String(e?.message || "").slice(0, 200) });
      }
    }
    return res.json({ answer: String(text || "").trim() });
  }));

  // Multipart STT: POST /api/ai/voice/stt (field name: audio)
  r.post("/voice/stt", requireAuth, upload.single("audio"), asyncHandler(async (req, res) => {
    if (config.aiVoiceProvider !== "openai") {
      return res.status(501).json({ error: "voice_provider_not_supported" });
    }
    if (!openai) {
      return res.status(501).json({ error: "openai_not_configured" });
    }
    if (!req.file) return res.status(400).json({ error: "missing_audio" });
    if (!req.file.buffer || req.file.buffer.length < 8) return res.status(400).json({ error: "missing_audio" });

    const mt = String(req.file.mimetype || "audio/webm");
    const file = new File([req.file.buffer], req.file.originalname || "audio.webm", {
      type: mt,
    });
    try {
      const out = await withTimeout(
        openai.audio.transcriptions.create({
          file,
          model: config.openaiSttModel,
        }),
        Number(process.env.AI_VOICE_TIMEOUT_MS || 30_000)
      );
      return res.json({ transcript: String(out?.text || "").trim() });
    } catch (e) {
      console.error("[ai/voice/stt] OpenAI error:", e?.message || e);
      if (e && typeof e === "object" && "message" in e && e.message === "timeout") {
        return res.status(504).json({ error: "ai_timeout" });
      }
      return res.status(503).json({ error: "voice_unavailable", detail: String(e?.message || "").slice(0, 200) });
    }
  }));

  // JSON TTS: POST /api/ai/voice/tts
  r.post("/voice/tts", requireAuth, asyncHandler(async (req, res) => {
    if (config.aiVoiceProvider !== "openai") {
      return res.status(501).json({ error: "voice_provider_not_supported" });
    }
    if (!openai) {
      return res.status(501).json({ error: "openai_not_configured" });
    }

    const schema = z.object({ text: z.string().min(1).max(4000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    try {
      const audio = await withTimeout(
        openai.audio.speech.create({
          model: config.openaiTtsModel,
          voice: config.openaiTtsVoice,
          input: parsed.data.text,
          format: "mp3",
        }),
        Number(process.env.AI_VOICE_TIMEOUT_MS || 30_000)
      );
      const arr = Buffer.from(await audio.arrayBuffer());
      return res.json({
        audioBase64: arr.toString("base64"),
        audioMime: "audio/mpeg",
      });
    } catch (e) {
      console.error("[ai/voice/tts] OpenAI error:", e?.message || e);
      if (e && typeof e === "object" && "message" in e && e.message === "timeout") {
        return res.status(504).json({ error: "ai_timeout" });
      }
      return res.status(503).json({ error: "voice_unavailable", detail: String(e?.message || "").slice(0, 200) });
    }
  }));

  // Backward-compatible JSON: POST /api/ai/voice { mode: stt|tts, ... }
  r.post("/voice", requireAuth, asyncHandler(async (_req, res) => {
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
  }));

  r.post("/focus", requireAuth, asyncHandler(async (req, res) => {
    const bodySchema = z.object({ focus_score: z.number().min(0).max(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    // store to json as content for now
    const rows = await db.getContent("focus_logs");
    const next = [...rows, { id: Date.now(), wallet: req.user.wallet, focus_score: parsed.data.focus_score, timestamp: new Date().toISOString() }];
    await db.setContent("focus_logs", next);

    res.json({ ok: true });
  }));

  // GET /api/ai/lecture-notes/cached?videoId=&topicId= — return saved notes for this lecture
  r.get("/lecture-notes/cached", requireAuth, asyncHandler(async (req, res) => {
    const q = z
      .object({
        videoId: z.string().min(1).max(80),
        topicId: z.string().min(1).max(80).optional(),
      })
      .safeParse(req.query || {});
    if (!q.success) return res.status(400).json({ error: "invalid_query" });

    const rows = await getDocSummariesStore();
    const hit = rows.find(
      (x) =>
        x &&
        typeof x === "object" &&
        x.wallet === req.user.wallet &&
        x.source_type === "lecture_video" &&
        x.video_id === q.data.videoId &&
        (!q.data.topicId || x.topic_id === q.data.topicId)
    );
    if (!hit) return res.json({ data: null });
    const normalized = finalizeLectureNotes(
      {
        title: hit.title,
        summary: hit.summary,
        highlightedNotes: hit.highlighted_notes || hit.highlightedNotes,
      },
      hit.title
    );
    res.json({
      data: {
        ...hit,
        title: normalized.title,
        summary: normalized.summary,
        highlighted_notes: normalized.highlightedNotes,
      },
    });
  }));

  // POST /api/ai/lecture-notes  { videoUrl, classroomId?, title?, topicId?, videoId?, ... }
  // Generates detailed structured notes from a YouTube lecture video URL using Gemini.
  r.post("/lecture-notes", requireAuth, asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      videoUrl: z.string().url().min(1),
      title: z.string().max(200).optional(),
      classroomId: z.string().max(100).optional(),
      topicId: z.string().max(80).optional(),
      videoId: z.string().max(80).optional(),
      topicTitle: z.string().max(200).optional(),
      topicDescription: z.string().max(1000).optional(),
      videoDescription: z.string().max(1000).optional(),
      regenerate: z.boolean().optional(),
    });
    const parsed = bodySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const model = getGeminiModel();
    if (!model) return res.status(501).json({ error: "gemini_not_configured" });

    const {
      videoUrl,
      title: reqTitle,
      classroomId,
      topicId,
      videoId,
      topicTitle,
      topicDescription,
      videoDescription,
      regenerate = false,
    } = parsed.data;
    const cleanUrl = normalizeYoutubeWatchUrl(videoUrl);

    let rows = await getDocSummariesStore();
    const existing = videoId ? findLectureNotesRow(rows, req.user.wallet, videoId, topicId) : null;

    // Return cached notes only when not explicitly regenerating
    if (!regenerate && videoId && existing?.summary) {
        const normalized = finalizeLectureNotes(
          {
            title: existing.title,
            summary: existing.summary,
            highlightedNotes: existing.highlighted_notes || existing.highlightedNotes,
          },
          existing.title
        );
    return res.json({
      ok: true,
      cached: true,
      data: {
        ...existing,
        title: normalized.title,
        summary: normalized.summary,
        highlighted_notes: normalized.highlightedNotes,
      },
    });
    }

    let out = "";
    let activeModel = model;
    try {
      out = await generateLectureNotesWithGemini({
        model: activeModel,
        cleanUrl,
        reqTitle,
        topicTitle,
        topicDescription,
        videoDescription,
        regenerate,
      });
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 404) {
        const fallbackModel = getGeminiClient()?.getGenerativeModel({ model: "gemini-2.5-flash" }) || null;
        if (!fallbackModel) return res.status(502).json({ error: "gemini_model_not_supported" });
        activeModel = fallbackModel;
        try {
          out = await generateLectureNotesWithGemini({
            model: activeModel,
            cleanUrl,
            reqTitle,
            topicTitle,
            topicDescription,
            videoDescription,
            regenerate,
          });
        } catch (fb) {
          console.error("[ai/lecture-notes] Gemini fallback failed:", fb?.message || fb);
          if (fb && typeof fb === "object" && "message" in fb && fb.message === "timeout") {
            return res.status(504).json({ error: "ai_timeout" });
          }
          if (isRetriableGeminiError(fb)) return res.status(503).json({ error: "gemini_busy" });
          return res.status(502).json({ error: "gemini_unavailable", detail: String(fb?.message || "").slice(0, 200) });
        }
      } else {
        if (e && typeof e === "object" && "message" in e && e.message === "timeout") {
          return res.status(504).json({ error: "ai_timeout" });
        }
        if (isRetriableGeminiError(e)) return res.status(503).json({ error: "gemini_busy" });
        console.error("[ai/lecture-notes] Gemini error:", e?.message || e);
        return res.status(502).json({ error: "gemini_unavailable", detail: String(e?.message || "").slice(0, 200) });
      }
    }

    const parsedNotes = await parseLectureNotesJson({
      out,
      model: activeModel,
      reqTitle,
      filename: reqTitle || "Lecture Notes",
    });
    const notes = finalizeLectureNotes(parsedNotes, reqTitle);

    if (!notes.summary || notes.summary.trim().length < 80) {
      console.error("[ai/lecture-notes] Empty or too-short summary after parse");
      return res.status(502).json({
        error: "notes_generation_failed",
        detail: "AI returned incomplete notes. Please try Regenerate again.",
      });
    }

    // Persist — replace existing row for this video when regenerating
    rows = await getDocSummariesStore();
    const now = new Date().toISOString();
    const row = {
      id: existing?.id || randomUUID(),
      wallet: req.user.wallet,
      filename: existing?.filename || `lecture_${Date.now()}.notes`,
      mimetype: "text/plain",
      title: notes.title,
      classroom_id: classroomId ?? existing?.classroom_id ?? null,
      topic_id: topicId ?? existing?.topic_id ?? null,
      video_id: videoId ?? existing?.video_id ?? null,
      topic_title: topicTitle ?? existing?.topic_title ?? null,
      source_type: "lecture_video",
      source_url: cleanUrl,
      created_at: now,
      summary: notes.summary,
      highlighted_notes: notes.highlightedNotes,
    };
    const withoutDupes = rows.filter(
      (x) =>
        !(
          x &&
          typeof x === "object" &&
          x.wallet === req.user.wallet &&
          x.source_type === "lecture_video" &&
          videoId &&
          x.video_id === videoId &&
          (!topicId || x.topic_id === topicId)
        )
    );
    await setDocSummariesStore([row, ...withoutDupes]);

    return res.json({ ok: true, cached: false, regenerated: !!regenerate, data: row });
  }));

  function buildPracticePrompt({ topicTitle, videoTitle, contextNotes, numMcq, numShort, numTheory }) {
    return (
      `You are an expert exam writer for university-level courses.\n` +
      `Topic: ${topicTitle || "General"}\n` +
      (videoTitle ? `Lecture focus: ${videoTitle}\n` : "") +
      (contextNotes ? `Study context (from lecture notes):\n${contextNotes.slice(0, 6000)}\n` : "") +
      `\nCreate a practice assessment with EXACTLY:\n` +
      `- ${numMcq} multiple-choice questions (4 options each, one correct)\n` +
      `- ${numShort} short-answer questions (2-4 sentence expected answers)\n` +
      `- ${numTheory} long theory questions (paragraph-level expected answers)\n` +
      `\nReturn ONLY valid JSON (no markdown fences):\n` +
      `{\n` +
      `  "title": string,\n` +
      `  "topicTitle": string,\n` +
      `  "scopeLabel": string,\n` +
      `  "mcq": [ { "id": string, "question": string, "choices": [string,string,string,string], "correctIndex": 0-3, "explanation": string } ],\n` +
      `  "shortAnswer": [ { "id": string, "question": string, "modelAnswer": string } ],\n` +
      `  "theory": [ { "id": string, "question": string, "modelAnswer": string, "rubric": string } ]\n` +
      `}\n` +
      `Rules:\n` +
      `- Questions must be clear, exam-style, and specific to the topic/lecture.\n` +
      `- MCQ distractors must be plausible; explanations must teach why the answer is correct.\n` +
      `- Short/theory model answers must be complete, readable prose (not JSON, not bullet dumps).\n` +
      `- Use unique ids like "mcq-1", "short-1", "theory-1".\n` +
      `- Do NOT wrap output in code fences.\n`
    );
  }

  function finalizePracticeSet(raw, meta = {}) {
    let data = raw;
    if (typeof raw === "string") {
      try {
        data = JSON.parse(extractFirstJsonObject(raw) || stripCodeFences(raw));
      } catch {
        data = {};
      }
    }
    let title = String(data?.title || meta.title || "Practice Set");
    let topicTitle = String(data?.topicTitle || meta.topicTitle || "");
    let scopeLabel = String(data?.scopeLabel || meta.scopeLabel || "");
    let mcq = Array.isArray(data?.mcq) ? data.mcq : [];
    let shortAnswer = Array.isArray(data?.shortAnswer) ? data.shortAnswer : [];
    let theory = Array.isArray(data?.theory) ? data.theory : [];

    const cleanMcq = mcq
      .map((q, i) => ({
        id: String(q?.id || `mcq-${i + 1}`),
        question: String(q?.question || "").trim(),
        choices: (Array.isArray(q?.choices) ? q.choices : ["A", "B", "C", "D"]).map((c) => String(c)),
        correctIndex: Math.max(0, Math.min(Number(q?.correctIndex ?? 0), 3)),
        explanation: String(q?.explanation || "").trim(),
      }))
      .filter((q) => q.question.length > 0);

    const cleanWritten = (arr, prefix) =>
      (Array.isArray(arr) ? arr : [])
        .map((q, i) => ({
          id: String(q?.id || `${prefix}-${i + 1}`),
          question: String(q?.question || "").trim(),
          modelAnswer: String(q?.modelAnswer || q?.answer || "").trim(),
          rubric: q?.rubric ? String(q.rubric) : undefined,
        }))
        .filter((q) => q.question.length > 0);

    return {
      title,
      topicTitle,
      scopeLabel,
      mcq: cleanMcq,
      shortAnswer: cleanWritten(shortAnswer, "short"),
      theory: cleanWritten(theory, "theory"),
    };
  }

  // POST /api/ai/practice/generate
  r.post("/practice/generate", requireAuth, asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      topicId: z.string().min(1).max(80),
      topicTitle: z.string().max(200).optional(),
      videoId: z.string().max(80).optional(),
      videoTitle: z.string().max(200).optional(),
      numMcq: z.number().int().min(0).max(30),
      numShort: z.number().int().min(0).max(20),
      numTheory: z.number().int().min(0).max(15),
    });
    const parsed = bodySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const total = parsed.data.numMcq + parsed.data.numShort + parsed.data.numTheory;
    if (total < 1 || total > 40) return res.status(400).json({ error: "invalid_counts" });

    const model = getGeminiModel();
    if (!model) return res.status(501).json({ error: "gemini_not_configured" });

    let contextNotes = "";
    if (parsed.data.videoId) {
      const rows = await getDocSummariesStore();
      const hit = findLectureNotesRow(rows, req.user.wallet, parsed.data.videoId, parsed.data.topicId);
      if (hit?.summary) contextNotes = String(hit.summary).slice(0, 8000);
    }

    const prompt = buildPracticePrompt({
      topicTitle: parsed.data.topicTitle,
      videoTitle: parsed.data.videoTitle,
      contextNotes,
      numMcq: parsed.data.numMcq,
      numShort: parsed.data.numShort,
      numTheory: parsed.data.numTheory,
    });

    let out = "";
    try {
      out = await withTimeout(
        generateWithGeminiRetry({ model, prompt, retries: 2 }),
        Number(process.env.AI_PRACTICE_TIMEOUT_MS || 120_000)
      );
    } catch (e) {
      if (e?.message === "timeout") return res.status(504).json({ error: "ai_timeout" });
      return res.status(502).json({ error: "gemini_unavailable" });
    }

    let parsedSet;
    try {
      const extracted = extractFirstJsonObject(out) || stripCodeFences(out);
      parsedSet = JSON.parse(extracted);
    } catch {
      try {
        const repaired = await summarizeRepairJson({ model, badText: out, filename: "Practice" });
        parsedSet = JSON.parse(extractFirstJsonObject(repaired) || repaired);
      } catch {
        return res.status(502).json({ error: "practice_parse_failed" });
      }
    }

    const scopeLabel = parsed.data.videoTitle
      ? `Lecture: ${parsed.data.videoTitle}`
      : `Topic: ${parsed.data.topicTitle || parsed.data.topicId}`;

    const set = finalizePracticeSet(parsedSet, {
      title: `${parsed.data.topicTitle || "Topic"} Practice`,
      topicTitle: parsed.data.topicTitle || parsed.data.topicId,
      scopeLabel,
    });

    if (!set.mcq.length && !set.shortAnswer.length && !set.theory.length) {
      return res.status(502).json({ error: "practice_empty" });
    }

    return res.json({ ok: true, data: set });
  }));

  // POST /api/ai/practice/grade-mcq  { questions: McqQuestion[], answers: { [id]: number } }
  r.post("/practice/grade-mcq", requireAuth, asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      questions: z.array(
        z.object({
          id: z.string(),
          question: z.string(),
          choices: z.array(z.string()),
          correctIndex: z.number().int(),
          explanation: z.string().optional(),
        })
      ),
      answers: z.record(z.string(), z.number().int()),
    });
    const parsed = bodySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const results = parsed.data.questions.map((q) => {
      const chosen = parsed.data.answers[q.id] ?? -1;
      const correct = chosen === q.correctIndex;
      return {
        id: q.id,
        correct,
        chosen,
        correctIndex: q.correctIndex,
        explanation: q.explanation || "",
      };
    });
    const score = results.filter((r) => r.correct).length;
    const total = results.length;
    return res.json({
      ok: true,
      data: {
        score,
        total,
        percent: total ? Math.round((score / total) * 100) : 0,
        results,
      },
    });
  }));

  r.post("/quiz", requireAuth, asyncHandler(async (req, res) => {
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
  }));

  return r;
}
