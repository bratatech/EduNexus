import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function attachSocketServer({ httpServer, config, db }) {
  const io = new Server(httpServer, {
    path: config.socketPath,
    cors: {
      origin: config.corsOrigin === "*" ? true : config.corsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (authHeader) {
      const token = String(authHeader).startsWith("Bearer ") ? String(authHeader).slice(7) : String(authHeader);
      try {
        socket.user = jwt.verify(token, config.jwtSecret);
      } catch {
        // allow anonymous
      }
    }
    next();
  });

  const roomMembers = new Map();

  function emitPresence(roomId) {
    const members = roomMembers.get(roomId) || new Map();
    const list = Array.from(members.values());
    io.to(roomId).emit("presence", { roomId, members: list });
  }

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId, name }) => {
      if (!roomId) return;
      socket.join(roomId);
      const members = roomMembers.get(roomId) || new Map();
      members.set(socket.id, {
        id: socket.id,
        name: name || socket.user?.wallet || "guest",
        wallet: socket.user?.wallet || null,
        joinedAt: Date.now(),
      });
      roomMembers.set(roomId, members);
      emitPresence(roomId);

      // send last messages if persisted
      try {
        const logs = await db.getContent("classroom_messages");
        const msgs = logs?.[roomId] || [];
        socket.emit("chat:history", { roomId, messages: msgs.slice(-50) });
      } catch {}
    });

    socket.on("room:leave", ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      const members = roomMembers.get(roomId);
      if (members) {
        members.delete(socket.id);
        emitPresence(roomId);
      }
    });

    socket.on("chat:send", async ({ roomId, message }) => {
      if (!roomId || !message) return;
      const msg = {
        id: Date.now(),
        user: message.user || socket.user?.wallet || "You",
        text: message.text || "",
        time: message.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      io.to(roomId).emit("chat:message", { roomId, message: msg });

      try {
        const logs = (await db.getContent("classroom_messages")) || {};
        const list = Array.isArray(logs[roomId]) ? logs[roomId] : [];
        const next = { ...logs, [roomId]: [...list, msg].slice(-200) };
        await db.setContent("classroom_messages", next);
      } catch {}
    });

    // WebRTC signaling relay
    socket.on("webrtc:signal", ({ roomId, to, data }) => {
      if (!roomId || !data) return;
      if (to) socket.to(to).emit("webrtc:signal", { from: socket.id, data });
      else socket.to(roomId).emit("webrtc:signal", { from: socket.id, data });
    });

    socket.on("disconnect", () => {
      for (const [roomId, members] of roomMembers.entries()) {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          emitPresence(roomId);
        }
      }
    });
  });

  return io;
}
