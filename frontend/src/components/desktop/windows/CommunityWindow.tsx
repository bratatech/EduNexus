import { useState, useRef, useEffect } from "react";
import { Window } from "../Window";
import { Hash, Send, Plus, Smile, Paperclip, Image, Film, AtSign } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  id: number;
  user: string;
  avatar: string;
  text: string;
  time: string;
  type: "text" | "image" | "gif" | "video" | "code" | "system";
  reactions?: { emoji: string; count: number }[];
  mediaUrl?: string;
}

interface Channel {
  id: string;
  name: string;
  icon: string;
  unread: number;
}

interface User {
  name: string;
  avatar: string;
  status: "online" | "idle" | "offline";
  role: string;
}

const GIF_COLLECTION = [
  "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif",
  "https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif",
  "https://media.giphy.com/media/du3J3cXyzhj75IOgvA/giphy.gif",
  "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif",
];

const EMOJI_LIST = ["😀", "😂", "🔥", "❤️", "👏", "💯", "🚀", "🎉", "👀", "💻", "🤖", "🌟", "👍", "✨", "💡", "🧠"];

export function CommunityWindow() {
  const [activeChannel, setActiveChannel] = useState("general");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showUsers, setShowUsers] = useState(true);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages[activeChannel] || [];

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getContent("community_channels"),
      api.getContent("community_users"),
      api.getContent("community_messages"),
    ])
      .then(([ch, us, ms]) => {
        if (!mounted) return;
        const chData = (ch?.data || []) as Channel[];
        setChannels(chData);
        setUsers((us?.data || []) as User[]);
        setMessages((ms?.data || {}) as Record<string, Message[]>);
        if (chData.length > 0 && !chData.some((c) => c.id === activeChannel)) {
          setActiveChannel(chData[0].id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setChannels([]);
        setUsers([]);
        setMessages({});
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [channelMessages.length]);

  const sendMessage = (text: string, type: Message["type"] = "text", mediaUrl?: string) => {
    if (!text.trim() && type === "text") return;
    const msg: Message = {
      id: Date.now(),
      user: "You",
      avatar: "😎",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type,
      mediaUrl,
    };
    // optimistic UI
    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), msg],
    }));
    setInput("");
    setShowEmoji(false);
    setShowGifs(false);

    // Persist if authenticated
    api
      .communitySendMessage(activeChannel, { text: msg.text || "(media)", type: msg.type, mediaUrl: msg.mediaUrl })
      .catch(() => {
        // ignore, UI already updated
      });

    // Simulate typing response
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const botReplies = [
        "That's a great point! 🎯",
        "Interesting perspective! Let me think about that.",
        "Totally agree! 🙌",
        "Welcome to the conversation! 👋",
        "Love the energy in this channel! 🔥",
      ];
      const reply: Message = {
        id: Date.now() + 1,
        user: (users[Math.floor(Math.random() * Math.min(4, users.length))] || { name: "System" }).name,
        avatar: (users[Math.floor(Math.random() * Math.min(4, users.length))] || { avatar: "🤖" }).avatar,
        text: botReplies[Math.floor(Math.random() * botReplies.length)],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text",
      };
      setMessages((prev) => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), reply],
      }));
    }, 1500 + Math.random() * 2000);
  };

  const addReaction = (msgId: number, emoji: string) => {
    setMessages((prev) => ({
      ...prev,
      [activeChannel]: (prev[activeChannel] || []).map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions?.find((r) => r.emoji === emoji);
        if (existing) {
          return { ...m, reactions: m.reactions!.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1 } : r) };
        }
        return { ...m, reactions: [...(m.reactions || []), { emoji, count: 1 }] };
      }),
    }));

    api
      .communityAddReaction(activeChannel, msgId, emoji)
      .catch(() => {
        // ignore
      });
  };

  return (
    <Window id="community">
      <div className="flex h-full" style={{ background: "#0f0f14" }}>
        {/* Channel sidebar */}
        <div className="w-52 shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(12,12,18,0.95)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-amber-400 font-mono text-xs uppercase tracking-[0.2em]">
              EduNexuZ Community
            </h3>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-gray-600">Channels</div>
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`flex items-center justify-between w-full px-3 py-1.5 text-xs transition-all ${
                  activeChannel === ch.id
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  {ch.name}
                </span>
                {ch.unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                    {ch.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-500" />
              <span className="text-white font-medium text-sm">{activeChannel}</span>
            </div>
            <button
              onClick={() => setShowUsers(!showUsers)}
              className={`text-xs px-2 py-1 rounded transition-all ${showUsers ? "text-amber-400 bg-amber-500/10" : "text-gray-500 hover:text-gray-300"}`}
            >
              <AtSign className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Messages */}
            <div className="flex-1 flex flex-col min-w-0">
              <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
                {channelMessages.map((msg) => (
                  <div key={msg.id} className={`group flex gap-3 ${msg.type === "system" ? "justify-center" : ""}`}>
                    {msg.type === "system" ? (
                      <div className="px-4 py-1.5 rounded-full text-xs text-cyan-400/70" style={{ background: "rgba(0,200,255,0.05)" }}>
                        {msg.text}
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl shrink-0 mt-0.5">{msg.avatar}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm font-medium ${msg.user === "You" ? "text-amber-400" : "text-white"}`}>
                              {msg.user}
                            </span>
                            <span className="text-[10px] text-gray-600">{msg.time}</span>
                          </div>
                          {msg.text && (
                            <p className="text-sm text-gray-300 leading-relaxed break-words">{msg.text}</p>
                          )}
                          {msg.type === "image" && msg.mediaUrl && (
                            <img src={msg.mediaUrl} alt="" className="mt-2 rounded-lg max-w-xs max-h-48 object-cover border" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                          )}
                          {msg.type === "gif" && msg.mediaUrl && (
                            <img src={msg.mediaUrl} alt="GIF" className="mt-2 rounded-lg max-w-xs max-h-48 object-cover" />
                          )}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {msg.reactions.map((r, i) => (
                                <button
                                  key={i}
                                  onClick={() => addReaction(msg.id, r.emoji)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-105"
                                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                                >
                                  {r.emoji} <span className="text-gray-400">{r.count}</span>
                                </button>
                              ))}
                              <button
                                className="opacity-0 group-hover:opacity-100 flex items-center px-2 py-0.5 rounded-full text-xs text-gray-600 hover:text-gray-400 transition-all"
                                style={{ background: "rgba(255,255,255,0.03)" }}
                                onClick={() => addReaction(msg.id, EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)])}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    Someone is typing...
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="px-4 py-3 border-t relative" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {/* Emoji picker */}
                {showEmoji && (
                  <div className="absolute bottom-full left-4 mb-2 p-3 rounded-lg grid grid-cols-8 gap-1" style={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                    {EMOJI_LIST.map((e) => (
                      <button key={e} onClick={() => setInput((i) => i + e)} className="p-1.5 rounded hover:bg-white/10 text-lg transition-all hover:scale-125">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {/* GIF picker */}
                {showGifs && (
                  <div className="absolute bottom-full left-4 mb-2 p-3 rounded-lg grid grid-cols-2 gap-2 w-80" style={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                    <div className="col-span-2 text-xs text-gray-500 mb-1">Popular GIFs</div>
                    {GIF_COLLECTION.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage("", "gif", url)}
                        className="rounded-md overflow-hidden hover:ring-2 ring-amber-500 transition-all"
                      >
                        <img src={url} alt="GIF" className="w-full h-24 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGifs(false); }}
                      className="grid place-items-center h-8 w-8 rounded text-gray-500 hover:text-amber-400 hover:bg-white/5 transition-all">
                      <Smile className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => { setShowGifs(!showGifs); setShowEmoji(false); }}
                      className="grid place-items-center h-8 w-8 rounded text-gray-500 hover:text-amber-400 hover:bg-white/5 transition-all">
                      <Film className="h-4 w-4" />
                    </button>
                    <button type="button"
                      className="grid place-items-center h-8 w-8 rounded text-gray-500 hover:text-amber-400 hover:bg-white/5 transition-all"
                      onClick={() => {
                        const url = prompt("Enter image URL:");
                        if (url) sendMessage("", "image", url);
                      }}
                    >
                      <Image className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message #${activeChannel}`}
                    className="flex-1 px-4 py-2 text-sm rounded-lg outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#e8d5c0", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <button
                    type="submit"
                    className="grid place-items-center h-9 w-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* User list */}
            {showUsers && (
              <div className="w-48 shrink-0 border-l overflow-auto p-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">
                  Online — {users.filter((u) => u.status === "online").length}
                </div>
                {users.filter((u) => u.status === "online").map((u) => (
                  <div key={u.name} className="flex items-center gap-2 py-1.5 text-xs">
                    <span className="relative">
                      <span className="text-lg">{u.avatar}</span>
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-[#0f0f14]" />
                    </span>
                    <div>
                      <div className="text-gray-300">{u.name}</div>
                      <div className="text-[10px] text-gray-600">{u.role}</div>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] uppercase tracking-wider text-gray-600 mt-3 mb-2">
                  Idle — {users.filter((u) => u.status === "idle").length}
                </div>
                {users.filter((u) => u.status === "idle").map((u) => (
                  <div key={u.name} className="flex items-center gap-2 py-1.5 text-xs opacity-60">
                    <span className="relative">
                      <span className="text-lg">{u.avatar}</span>
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500 border border-[#0f0f14]" />
                    </span>
                    <div>
                      <div className="text-gray-400">{u.name}</div>
                      <div className="text-[10px] text-gray-600">{u.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}
