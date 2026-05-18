import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

const STORE_KEY = "classroom_playlists";

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

function toYoutubeEmbedUrl(watchOrEmbed) {
  const watch = normalizeYoutubeWatchUrl(watchOrEmbed);
  try {
    const u = new URL(watch);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
  } catch { /* ignore */ }
  const m = String(watchOrEmbed).match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`;
  return watchOrEmbed;
}

export function classroomRouter({ db }) {
  const r = express.Router();

  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  async function getStore() {
    const raw = await db.getContent(STORE_KEY);
    if (raw && typeof raw === "object" && Array.isArray(raw.topics)) return raw;
    return { version: 1, topics: [] };
  }

  async function setStore(store) {
    await db.setContent(STORE_KEY, store);
  }

  function sortTopics(topics) {
    return [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function sortVideos(videos) {
    return [...videos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function publicTopicSummary(topic) {
    const videos = Array.isArray(topic.videos) ? topic.videos : [];
    return {
      id: topic.id,
      title: topic.title,
      description: topic.description || "",
      icon: topic.icon || "📚",
      order: topic.order ?? 0,
      video_count: videos.length,
    };
  }

  function publicVideo(video, topicId) {
    return {
      id: video.id,
      topic_id: topicId,
      title: video.title,
      description: video.description || "",
      duration_min: video.duration_min ?? null,
      order: video.order ?? 0,
      youtube_embed_url: toYoutubeEmbedUrl(video.youtube_url),
      youtube_watch_url: normalizeYoutubeWatchUrl(video.youtube_url),
    };
  }

  // GET /api/classroom/topics — topic list only (no video URLs until topic is selected)
  r.get("/topics", asyncHandler(async (_req, res) => {
    const store = await getStore();
    const topics = sortTopics(store.topics || []).map(publicTopicSummary);
    res.json({ data: topics });
  }));

  // GET /api/classroom/topics/:topicId — full playlist for selected topic
  r.get("/topics/:topicId", asyncHandler(async (req, res) => {
    const store = await getStore();
    const topic = (store.topics || []).find((t) => t && t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "topic_not_found" });

    const videos = sortVideos(topic.videos || []).map((v) => publicVideo(v, topic.id));
    res.json({
      data: {
        ...publicTopicSummary(topic),
        videos,
      },
    });
  }));

  // GET /api/classroom/topics/:topicId/videos/:videoId
  r.get("/topics/:topicId/videos/:videoId", asyncHandler(async (req, res) => {
    const store = await getStore();
    const topic = (store.topics || []).find((t) => t && t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "topic_not_found" });
    const video = (topic.videos || []).find((v) => v && v.id === req.params.videoId);
    if (!video) return res.status(404).json({ error: "video_not_found" });
    res.json({ data: publicVideo(video, topic.id) });
  }));

  // ─── Admin: manage playlist in JSON (auth required) ─────────────────────────

  const topicBodySchema = z.object({
    id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    icon: z.string().max(8).optional(),
    order: z.number().int().min(0).optional(),
  });

  const videoBodySchema = z.object({
    id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    youtube_url: z.string().url().min(1),
    duration_min: z.number().int().min(1).max(600).optional(),
    order: z.number().int().min(0).optional(),
  });

  // POST /api/classroom/admin/topics
  r.post("/admin/topics", requireAuth, asyncHandler(async (req, res) => {
    const parsed = topicBodySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const store = await getStore();
    if ((store.topics || []).some((t) => t.id === parsed.data.id)) {
      return res.status(409).json({ error: "topic_exists" });
    }

    const topic = {
      ...parsed.data,
      description: parsed.data.description || "",
      icon: parsed.data.icon || "📚",
      order: parsed.data.order ?? (store.topics?.length || 0),
      videos: [],
    };
    store.topics = [...(store.topics || []), topic];
    await setStore(store);
    res.status(201).json({ ok: true, data: publicTopicSummary(topic) });
  }));

  // POST /api/classroom/admin/topics/:topicId/videos
  r.post("/admin/topics/:topicId/videos", requireAuth, asyncHandler(async (req, res) => {
    const parsed = videoBodySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const store = await getStore();
    const idx = (store.topics || []).findIndex((t) => t && t.id === req.params.topicId);
    if (idx === -1) return res.status(404).json({ error: "topic_not_found" });

    const topic = store.topics[idx];
    const videos = Array.isArray(topic.videos) ? topic.videos : [];
    if (videos.some((v) => v.id === parsed.data.id)) {
      return res.status(409).json({ error: "video_exists" });
    }

    const video = {
      ...parsed.data,
      youtube_url: normalizeYoutubeWatchUrl(parsed.data.youtube_url),
      description: parsed.data.description || "",
      order: parsed.data.order ?? videos.length,
    };
    topic.videos = [...videos, video];
    store.topics[idx] = topic;
    await setStore(store);
    res.status(201).json({ ok: true, data: publicVideo(video, topic.id) });
  }));

  // PATCH /api/classroom/admin/topics/:topicId/videos/:videoId
  r.patch("/admin/topics/:topicId/videos/:videoId", requireAuth, asyncHandler(async (req, res) => {
    const patchSchema = videoBodySchema.partial().omit({ id: true });
    const parsed = patchSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

    const store = await getStore();
    const topic = (store.topics || []).find((t) => t && t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "topic_not_found" });

    const vidx = (topic.videos || []).findIndex((v) => v && v.id === req.params.videoId);
    if (vidx === -1) return res.status(404).json({ error: "video_not_found" });

    const prev = topic.videos[vidx];
    const next = {
      ...prev,
      ...parsed.data,
      id: prev.id,
      youtube_url: parsed.data.youtube_url
        ? normalizeYoutubeWatchUrl(parsed.data.youtube_url)
        : prev.youtube_url,
    };
    topic.videos[vidx] = next;
    await setStore(store);
    res.json({ ok: true, data: publicVideo(next, topic.id) });
  }));

  // DELETE /api/classroom/admin/topics/:topicId/videos/:videoId
  r.delete("/admin/topics/:topicId/videos/:videoId", requireAuth, asyncHandler(async (req, res) => {
    const store = await getStore();
    const topic = (store.topics || []).find((t) => t && t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "topic_not_found" });

    const before = (topic.videos || []).length;
    topic.videos = (topic.videos || []).filter((v) => v && v.id !== req.params.videoId);
    if (topic.videos.length === before) return res.status(404).json({ error: "video_not_found" });

    await setStore(store);
    res.json({ ok: true });
  }));

  return r;
}
