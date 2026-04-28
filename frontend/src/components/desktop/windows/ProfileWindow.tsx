import { useState, useEffect } from "react";
import { Window } from "../Window";
import { Edit3, Save, X, Trophy, BookOpen, MessageSquare, Shield, Calendar, MapPin, Mail, User } from "lucide-react";
import { api } from "@/lib/api";

interface ProfileData {
  username: string;
  email: string;
  bio: string;
  role: string;
  location: string;
  joinDate: string;
  avatarSeed: string;
  coursesEnrolled: number;
  messagesSent: number;
  badgesEarned: number;
  eduvTokens: number;
}

const FALLBACK_PROFILE: ProfileData = {
  username: "operator",
  email: "operator@edunexuz.io",
  bio: "Exploring the decentralized future. Student at EduNexuZ ctOS network.",
  role: "Student",
  location: "Cyberspace",
  joinDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  avatarSeed: "operator",
  coursesEnrolled: 2,
  messagesSent: 42,
  badgesEarned: 3,
  eduvTokens: 1250,
};

const AVATAR_STYLES = ["adventurer", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "notionists", "open-peeps", "personas", "pixel-art"];

function getAvatarUrl(seed: string, style: string = "bottts") {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f0a35a&scale=90`;
}

export function ProfileWindow() {
  const [defaults, setDefaults] = useState<ProfileData>(FALLBACK_PROFILE);

  useEffect(() => {
    let mounted = true;
    api
      .getContent("default_profile")
      .then((r) => {
        if (!mounted) return;
        const d = (r?.data || {}) as Partial<ProfileData>;
        const joinDate = d.joinDate && String(d.joinDate).trim().length > 0
          ? String(d.joinDate)
          : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        setDefaults({ ...FALLBACK_PROFILE, ...d, joinDate });
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const saved = localStorage.getItem("edunexuz-profile");
      if (saved) return { ...FALLBACK_PROFILE, ...JSON.parse(saved) };
      // Check login data
      const user = localStorage.getItem("edunexuz-user");
      if (user) {
        const { username, email } = JSON.parse(user);
        return { ...FALLBACK_PROFILE, username: username || "operator", email: email || FALLBACK_PROFILE.email };
      }
    } catch {}
    return FALLBACK_PROFILE;
  });
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<ProfileData>(profile);
  const [avatarStyle, setAvatarStyle] = useState("bottts");

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((r) => {
        if (!mounted) return;
        const joinDate = (r.profile?.join_date as string) || profile.joinDate;
        setProfile((p) => ({
          ...p,
          username: r.user.wallet || p.username,
          email: (r.user.email as string) || p.email,
          bio: (r.profile?.bio as string) || p.bio,
          role: (r.profile?.role as string) || p.role,
          location: (r.profile?.location as string) || p.location,
          avatarSeed: (r.profile?.avatar_seed as string) || p.avatarSeed,
          joinDate,
          coursesEnrolled: r.stats.classesAttended,
          messagesSent: r.stats.communityMessages,
          badgesEarned: p.badgesEarned,
          eduvTokens: r.stats.eduvTokens,
        }));
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem("edunexuz-profile", JSON.stringify(profile)); } catch {}
  }, [profile]);

  useEffect(() => {
    // Apply backend defaults once loaded, but do not override existing saved values.
    try {
      const saved = localStorage.getItem("edunexuz-profile");
      if (saved) return;
    } catch {}

    setProfile((p) => ({ ...defaults, ...p }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  const startEdit = () => {
    setEditData({ ...profile });
    setEditing(true);
  };

  const save = () => {
    setProfile(editData);
    setEditing(false);

    api
      .updateMyProfile({
        bio: editData.bio,
        role: editData.role,
        location: editData.location,
        avatar_seed: editData.avatarSeed,
        join_date: editData.joinDate,
      })
      .catch(() => {
        // ignore
      });
  };

  const cancel = () => {
    setEditing(false);
  };

  const STATS = [
    { icon: BookOpen, label: "Courses", value: profile.coursesEnrolled, color: "#8b5cf6" },
    { icon: MessageSquare, label: "Messages", value: profile.messagesSent, color: "#06b6d4" },
    { icon: Trophy, label: "Badges", value: profile.badgesEarned, color: "#f59e0b" },
    { icon: Shield, label: "EDUV", value: profile.eduvTokens, color: "#22c55e" },
  ];

  return (
    <Window id="profile">
      <div className="h-full overflow-auto" style={{ background: "#0f0f14" }}>
        {/* Header banner */}
        <div className="relative h-32" style={{ background: "linear-gradient(135deg, rgba(240,163,90,0.2), rgba(139,92,246,0.2), rgba(6,182,212,0.1))" }}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "linear-gradient(rgba(240,163,90,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(240,163,90,0.3) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }} />
          {/* Edit button */}
          <div className="absolute top-3 right-3">
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: "rgba(0,0,0,0.5)", color: "#f0a35a", border: "1px solid rgba(240,163,90,0.3)" }}
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={save}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-500/20 text-green-400 border border-green-500/30"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  onClick={cancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Avatar + Name */}
        <div className="px-6 -mt-12 mb-6">
          <div className="flex items-end gap-4">
            <div className="relative group">
              <img
                src={getAvatarUrl(editing ? editData.avatarSeed : profile.avatarSeed, avatarStyle)}
                alt="Avatar"
                className="h-24 w-24 rounded-xl border-4"
                style={{ borderColor: "#0f0f14", background: "rgba(240,163,90,0.1)" }}
              />
              {editing && (
                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => {
                    const seed = prompt("Enter avatar seed (any text):", editData.avatarSeed);
                    if (seed) setEditData((d) => ({ ...d, avatarSeed: seed }));
                  }}
                >
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div className="pb-1">
              {editing ? (
                <input
                  value={editData.username}
                  onChange={(e) => setEditData((d) => ({ ...d, username: e.target.value }))}
                  className="text-xl font-medium bg-transparent outline-none border-b border-amber-500/30 text-white pb-0.5 mb-1"
                />
              ) : (
                <h2 className="text-xl font-medium text-white">{profile.username}</h2>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                  style={{ background: "rgba(240,163,90,0.15)", color: "#f0a35a", border: "1px solid rgba(240,163,90,0.2)" }}>
                  {profile.role}
                </span>
                <span className="text-xs text-gray-600">• Member since {profile.joinDate}</span>
              </div>
            </div>
          </div>

          {/* Avatar style picker (edit mode) */}
          {editing && (
            <div className="mt-3 flex flex-wrap gap-1">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setAvatarStyle(style)}
                  className={`px-2 py-1 rounded text-[10px] transition-all ${
                    avatarStyle === style ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-gray-600 hover:text-gray-400 border border-transparent"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-4 gap-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl" style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}15` }}>
                <stat.icon className="h-5 w-5 mx-auto mb-1.5" style={{ color: stat.color }} />
                <div className="text-lg font-mono font-medium text-white">{stat.value.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile details as profile.txt */}
        <div className="px-6 pb-6">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            {/* File header */}
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-mono" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-amber-400">📄</span>
              <span className="text-gray-400">profile.txt</span>
              <span className="text-gray-600">— EduNexuZ User Profile</span>
            </div>
            {/* Content */}
            <div className="p-4 font-mono text-sm space-y-3" style={{ background: "rgba(15,15,22,0.8)" }}>
              <ProfileField
                icon={<User className="h-3.5 w-3.5" />}
                label="Display Name"
                value={editing ? editData.username : profile.username}
                editing={editing}
                onChange={(v) => setEditData((d) => ({ ...d, username: v }))}
              />
              <ProfileField
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email"
                value={editing ? editData.email : profile.email}
                editing={editing}
                onChange={(v) => setEditData((d) => ({ ...d, email: v }))}
              />
              <ProfileField
                icon={<Shield className="h-3.5 w-3.5" />}
                label="Role"
                value={editing ? editData.role : profile.role}
                editing={editing}
                onChange={(v) => setEditData((d) => ({ ...d, role: v }))}
              />
              <ProfileField
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Location"
                value={editing ? editData.location : profile.location}
                editing={editing}
                onChange={(v) => setEditData((d) => ({ ...d, location: v }))}
              />
              <ProfileField
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Joined"
                value={profile.joinDate}
                editing={false}
              />

              <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 text-gray-600 mb-1.5">
                  <Edit3 className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">Bio</span>
                </div>
                {editing ? (
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData((d) => ({ ...d, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-md outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#e8d5c0", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                ) : (
                  <p className="text-gray-300 text-xs leading-relaxed">{profile.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}

function ProfileField({
  icon, label, value, editing, onChange
}: {
  icon: React.ReactNode; label: string; value: string; editing: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-600 shrink-0">{icon}</div>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 w-24 shrink-0">{label}:</span>
        {editing && onChange ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-2 py-1 text-xs rounded outline-none"
            style={{ background: "rgba(255,255,255,0.05)", color: "#e8d5c0", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        ) : (
          <span className="text-gray-300 text-xs">{value}</span>
        )}
      </div>
    </div>
  );
}
