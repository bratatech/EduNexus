// In dev, use same-origin + Vite proxy (/api → backend). In prod, set VITE_API_BASE_URL at build time.
const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "" : "");

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[EduNexuZ] VITE_API_BASE_URL is not set. API calls will fail until you add it in Netlify → Site settings → Environment variables and redeploy."
  );
}

export type ApiErrorCode = string;

export interface ApiErrorShape {
  error?: ApiErrorCode;
}

export type CommunityMessageType = "text" | "image" | "gif" | "video" | "code" | "system";

export interface CommunityMessageCreatePayload {
  text: string;
  type?: CommunityMessageType;
  mediaUrl?: string;
}

export interface ApiError extends Error {
  data?: unknown;
}

function getToken() {
  try {
    return localStorage.getItem("edunexuz-token") || "";
  } catch {
    return "";
  }
}

export function setToken(token: string) {
  try {
    if (token) localStorage.setItem("edunexuz-token", token);
    else localStorage.removeItem("edunexuz-token");
  } catch { }
}

function parseApiJson(text: string, status: number): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const isHtml = /^\s*</.test(text);
    const err: ApiError = new Error(isHtml ? "api_unavailable" : "invalid_json") as ApiError;
    err.data = { status, preview: text.slice(0, 160) };
    throw err;
  }
}

export async function apiFetch(
  path: string,
  {
    method = "GET",
    body,
    auth = false,
    headers,
  }: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
  } = {}
): Promise<unknown> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...(headers || {}) };
  if (auth) {
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const data = parseApiJson(text, res.status);
  if (!res.ok) {
    const code = (data && typeof data === "object" && "error" in (data as any) ? (data as any).error : null) as
      | string
      | null;
    const err: ApiError = new Error(code || `http_${res.status}`) as ApiError;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiFetchForm(
  path: string,
  {
    method = "POST",
    form,
    auth = false,
    headers,
  }: {
    method?: string;
    form: FormData;
    auth?: boolean;
    headers?: Record<string, string>;
  }
): Promise<unknown> {
  const h: Record<string, string> = { ...(headers || {}) };
  if (auth) {
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: h,
    body: form,
  });

  const text = await res.text();
  const data = parseApiJson(text, res.status);
  if (!res.ok) {
    const code = (data && typeof data === "object" && "error" in (data as any) ? (data as any).error : null) as
      | string
      | null;
    const err: ApiError = new Error(code || `http_${res.status}`) as ApiError;
    err.data = data;
    throw err;
  }
  return data;
}

export interface AuthUser {
  wallet: string;
  name?: string | null;
  email?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface ContentResponse<T> {
  data: T;
}

export interface TokenBalanceResponse {
  wallet: string;
  balance: number;
}

export interface AiTutorResponse {
  answer: string;
}

export type AiVoiceMode = "stt" | "tts";

export interface AiVoiceRequest {
  mode: AiVoiceMode;
  audioBase64?: string;
  audioMime?: string;
  text?: string;
}

export interface AiVoiceSttResponse {
  transcript: string;
}

export interface AiVoiceTtsResponse {
  audioBase64: string;
  audioMime: string;
}

export interface AiVoiceSttMultipartResponse {
  transcript: string;
}

export interface RealtimeConfigResponse {
  ok: boolean;
  socketPath: string;
  iceServers: RTCIceServer[];
}

export interface MeResponse {
  user: AuthUser;
  profile: Record<string, any>;
  stats: {
    eduvTokens: number;
    classesAttended: number;
    communityMessages: number;
  };
}

export interface EnrollRequestPayload {
  name: string;
  email: string;
  phone?: string;
  level?: string;
  subjects: string[];
  format?: string;
  message?: string;
}

export const api = {
  health: async (): Promise<{ ok: boolean; service?: string }> => {
    return (await apiFetch("/api/health")) as { ok: boolean; service?: string };
  },
  getContent: async <T = unknown>(name: string): Promise<ContentResponse<T>> => {
    return (await apiFetch(`/api/content/${name}`)) as ContentResponse<T>;
  },
  enroll: async (payload: EnrollRequestPayload): Promise<{ ok: boolean }> => {
    return (await apiFetch("/api/enroll", { method: "POST", body: payload })) as { ok: boolean };
  },
  register: async ({
    wallet,
    name,
    email,
    password,
  }: {
    wallet: string;
    name: string;
    email?: string;
    password: string;
  }): Promise<AuthResponse> => {
    return (await apiFetch("/api/users/register", { method: "POST", body: { wallet, name, email, password } })) as AuthResponse;
  },
  login: async ({ wallet, password }: { wallet: string; password: string }): Promise<AuthResponse> => {
    return (await apiFetch("/api/users/login", { method: "POST", body: { wallet, password } })) as AuthResponse;
  },
  tokenBalance: async (): Promise<TokenBalanceResponse> => {
    return (await apiFetch("/api/tokens/balance", { auth: true })) as TokenBalanceResponse;
  },

  aiTutor: async (prompt: string): Promise<AiTutorResponse> => {
    return (await apiFetch("/api/ai/tutor", { method: "POST", body: { prompt }, auth: true })) as AiTutorResponse;
  },
  aiVoice: async (payload: AiVoiceRequest): Promise<AiVoiceSttResponse | AiVoiceTtsResponse> => {
    return (await apiFetch("/api/ai/voice", { method: "POST", body: payload, auth: true })) as
      | AiVoiceSttResponse
      | AiVoiceTtsResponse;
  },
  aiVoiceTts: async (text: string): Promise<AiVoiceTtsResponse> => {
    return (await apiFetch("/api/ai/voice/tts", { method: "POST", body: { text }, auth: true })) as AiVoiceTtsResponse;
  },

  aiVoiceStt: async ({
    audio,
    filename,
  }: {
    audio: Blob;
    filename?: string;
  }): Promise<AiVoiceSttMultipartResponse> => {
    const form = new FormData();
    form.append("audio", audio, filename || "audio.webm");
    return (await apiFetchForm("/api/ai/voice/stt", { form, auth: true })) as AiVoiceSttMultipartResponse;
  },

  realtimeConfig: async (): Promise<RealtimeConfigResponse> => {
    return (await apiFetch("/api/realtime/config")) as RealtimeConfigResponse;
  },

  me: async (): Promise<MeResponse> => {
    return (await apiFetch("/api/me", { auth: true })) as MeResponse;
  },
  updateMyProfile: async (profile: Record<string, any>): Promise<{ ok: boolean; profile: Record<string, any> }> => {
    return (await apiFetch("/api/me/profile", { method: "PUT", body: profile, auth: true })) as {
      ok: boolean;
      profile: Record<string, any>;
    };
  },

  communitySendMessage: async (channelId: string, payload: CommunityMessageCreatePayload): Promise<{ ok: boolean; message: unknown }> => {
    return (await apiFetch(`/api/community/messages/${channelId}`, { method: "POST", body: payload, auth: true })) as { ok: boolean; message: unknown };
  },
  communityAddReaction: async (channelId: string, messageId: number, emoji: string): Promise<{ ok: boolean }> => {
    return (await apiFetch(`/api/community/reactions/${channelId}/${messageId}`, { method: "POST", body: { emoji }, auth: true })) as { ok: boolean };
  },

  aiDocumentsList: async (): Promise<{ data: unknown[] }> => {
    return (await apiFetch("/api/ai/documents", { auth: true })) as { data: unknown[] };
  },
  aiDocumentsSummarize: async ({
    file,
    title,
    classroomId,
  }: {
    file: File;
    title?: string;
    classroomId?: string;
  }): Promise<{ ok: boolean; data: unknown }> => {
    const form = new FormData();
    form.append("document", file);
    if (title) form.append("title", title);
    if (classroomId) form.append("classroomId", classroomId);
    return (await apiFetchForm("/api/ai/documents/summarize", { form, auth: true })) as { ok: boolean; data: unknown };
  },

  aiLectureNotes: async ({
    videoUrl,
    title,
    classroomId,
    topicId,
    videoId,
    topicTitle,
    topicDescription,
    videoDescription,
    regenerate = false,
  }: {
    videoUrl: string;
    title?: string;
    classroomId?: string;
    topicId?: string;
    videoId?: string;
    topicTitle?: string;
    topicDescription?: string;
    videoDescription?: string;
    regenerate?: boolean;
  }): Promise<{ ok: boolean; data: unknown; cached?: boolean; regenerated?: boolean }> => {
    return (await apiFetch("/api/ai/lecture-notes", {
      method: "POST",
      body: {
        videoUrl,
        title,
        classroomId,
        topicId,
        videoId,
        topicTitle,
        topicDescription,
        videoDescription,
        regenerate,
      },
      auth: true,
    })) as { ok: boolean; data: unknown; cached?: boolean; regenerated?: boolean };
  },

  aiLectureNotesCached: async ({
    videoId,
    topicId,
  }: {
    videoId: string;
    topicId?: string;
  }): Promise<{ data: unknown | null }> => {
    const q = new URLSearchParams({ videoId });
    if (topicId) q.set("topicId", topicId);
    return (await apiFetch(`/api/ai/lecture-notes/cached?${q}`, { auth: true })) as { data: unknown | null };
  },

  classroomTopics: async (): Promise<{ data: unknown[] }> => {
    return (await apiFetch("/api/classroom/topics")) as { data: unknown[] };
  },

  classroomTopicPlaylist: async (topicId: string): Promise<{ data: unknown }> => {
    return (await apiFetch(`/api/classroom/topics/${encodeURIComponent(topicId)}`)) as { data: unknown };
  },

  practiceSetsList: async (): Promise<{ data: unknown[] }> => {
    return (await apiFetch("/api/practice/sets")) as { data: unknown[] };
  },

  practiceByTopic: async (topicId: string): Promise<{ data: unknown; source?: string }> => {
    return (await apiFetch(`/api/practice/by-topic/${encodeURIComponent(topicId)}`)) as {
      data: unknown;
      source?: string;
    };
  },

  practiceByLecture: async (
    topicId: string,
    videoId: string
  ): Promise<{ data: unknown; source?: string }> => {
    return (await apiFetch(
      `/api/practice/by-lecture/${encodeURIComponent(topicId)}/${encodeURIComponent(videoId)}`
    )) as { data: unknown; source?: string };
  },

  aiPracticeGenerate: async (body: {
    topicId: string;
    topicTitle?: string;
    videoId?: string;
    videoTitle?: string;
    numMcq: number;
    numShort: number;
    numTheory: number;
  }) => {
    return (await apiFetch("/api/ai/practice/generate", { method: "POST", body, auth: true })) as {
      ok: boolean;
      data: unknown;
    };
  },

  aiPracticeGradeMcq: async (body: {
    questions: unknown[];
    answers: Record<string, number>;
  }) => {
    return (await apiFetch("/api/ai/practice/grade-mcq", { method: "POST", body, auth: true })) as {
      ok: boolean;
      data: unknown;
    };
  },

  classroomAddVideo: async (
    topicId: string,
    body: {
      id: string;
      title: string;
      youtube_url: string;
      description?: string;
      duration_min?: number;
      order?: number;
    }
  ): Promise<{ ok: boolean; data: unknown }> => {
    return (await apiFetch(`/api/classroom/admin/topics/${encodeURIComponent(topicId)}/videos`, {
      method: "POST",
      body,
      auth: true,
    })) as { ok: boolean; data: unknown };
  },
};
