import express from "express";

export function contentRouter({ db }) {
  const r = express.Router();

  // public content endpoints to remove hardcoded frontend arrays
  r.get("/:name", async (req, res) => {
    const allowed = new Set([
      "programs",
      "tutors",
      "posts",
      "courses",
      "community_channels",
      "community_users",
      "community_messages",
      "wallpapers",
      "subjects",
      "terminal_filesystem",
      "terminal_fortunes",
      "default_profile",
      "mobile_programs",
      "firefox_bookmarks",
    ]);
    const name = req.params.name;
    if (!allowed.has(name)) return res.status(404).json({ error: "not_found" });

    const data = await db.getContent(name);
    res.json({ data });
  });

  return r;
}
