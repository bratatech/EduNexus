import express from "express";
import { readJson } from "../storage/jsonStore.js";

const STORE_FILE = "practice_questions.json";

async function getStore() {
  const raw = await readJson(STORE_FILE, { version: 1, sets: [] });
  if (raw && typeof raw === "object" && Array.isArray(raw.sets)) return raw;
  return { version: 1, sets: [] };
}

export function practiceRouter() {
  const r = express.Router();

  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  function publicSetSummary(set) {
    return {
      id: set.id,
      topic_id: set.topic_id,
      video_id: set.video_id || null,
      title: set.title,
      topicTitle: set.topicTitle,
      scopeLabel: set.scopeLabel,
      mcq_count: Array.isArray(set.mcq) ? set.mcq.length : 0,
      short_count: Array.isArray(set.shortAnswer) ? set.shortAnswer.length : 0,
      theory_count: Array.isArray(set.theory) ? set.theory.length : 0,
    };
  }

  // GET /api/practice/sets — list all question banks
  r.get("/sets", asyncHandler(async (_req, res) => {
    const store = await getStore();
    res.json({ data: (store.sets || []).map(publicSetSummary) });
  }));

  // GET /api/practice/sets/:setId — full practice set
  r.get("/sets/:setId", asyncHandler(async (req, res) => {
    const store = await getStore();
    const set = (store.sets || []).find((s) => s && s.id === req.params.setId);
    if (!set) return res.status(404).json({ error: "set_not_found" });
    res.json({ data: set, source: "bank" });
  }));

  // GET /api/practice/by-topic/:topicId — topic-level bank (video_id null)
  r.get("/by-topic/:topicId", asyncHandler(async (req, res) => {
    const store = await getStore();
    const set = (store.sets || []).find(
      (s) => s && s.topic_id === req.params.topicId && !s.video_id
    );
    if (!set) return res.status(404).json({ error: "set_not_found" });
    res.json({ data: set, source: "bank" });
  }));

  // GET /api/practice/by-lecture/:topicId/:videoId
  r.get("/by-lecture/:topicId/:videoId", asyncHandler(async (req, res) => {
    const store = await getStore();
    let set = (store.sets || []).find(
      (s) => s && s.topic_id === req.params.topicId && s.video_id === req.params.videoId
    );
    if (!set) {
      set = (store.sets || []).find((s) => s && s.topic_id === req.params.topicId && !s.video_id);
    }
    if (!set) return res.status(404).json({ error: "set_not_found" });
    res.json({ data: set, source: "bank" });
  }));

  return r;
}
