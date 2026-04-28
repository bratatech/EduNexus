import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  databaseUrl: process.env.DATABASE_URL || "",
  dbMode: (process.env.DB_MODE || "auto").toLowerCase(), // auto|pg|json
  seedFromJson: (process.env.SEED_FROM_JSON || "1").toLowerCase() !== "0",

  // Realtime
  socketPath: process.env.SOCKET_PATH || "/socket.io",

  // AI providers (optional)
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY || "",
  googleAiModel: process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash",

  aiTutorProvider: (process.env.AI_TUTOR_PROVIDER || "gemini").toLowerCase(), // gemini|ollama
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "gemma2:2b",

  aiVoiceProvider: (process.env.AI_VOICE_PROVIDER || "openai").toLowerCase(), // openai
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiSttModel: process.env.OPENAI_STT_MODEL || "whisper-1",
  openaiTtsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  openaiTtsVoice: process.env.OPENAI_TTS_VOICE || "alloy",

  // WebRTC ICE servers (STUN/TURN)
  webrtcIceServersJson: process.env.WEBRTC_ICE_SERVERS_JSON || "",
};
