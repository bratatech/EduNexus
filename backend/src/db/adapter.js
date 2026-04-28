import { readJson, writeJson } from "../storage/jsonStore.js";

export function createDb({ mode, pool }) {
  const usePg = mode === "pg" || (mode === "auto" && !!pool);

  return {
    mode: usePg ? "pg" : "json",

    async upsertUser({ wallet, name, email, passwordHash }) {
      if (usePg) {
        const res = await pool.query(
          `insert into users(wallet, name, email, password_hash)
           values($1,$2,$3,$4)
           on conflict(wallet) do update set name=excluded.name, email=excluded.email, password_hash=coalesce(excluded.password_hash, users.password_hash)
           returning id, wallet, name, email, xp, created_at`,
          [wallet, name, email, passwordHash || null]
        );
        return res.rows[0];
      }

      const users = await readJson("users.json", []);
      const idx = users.findIndex((u) => u.wallet === wallet);
      const row = {
        id: idx >= 0 ? users[idx].id : (users.reduce((m, u) => Math.max(m, u.id || 0), 0) + 1),
        wallet,
        name,
        email,
        password_hash: passwordHash || (idx >= 0 ? users[idx].password_hash : null),
        xp: idx >= 0 ? users[idx].xp ?? 0 : 0,
        created_at: idx >= 0 ? users[idx].created_at : new Date().toISOString(),
      };
      if (idx >= 0) users[idx] = { ...users[idx], ...row };
      else users.push(row);
      await writeJson("users.json", users);
      const { password_hash, ...safe } = row;
      return safe;
    },

    async getProfile(wallet) {
      if (usePg) {
        const res = await pool.query(
          "select user_wallet, bio, role, location, avatar_seed, join_date from profiles where user_wallet=$1",
          [wallet]
        );
        return res.rows[0] || null;
      }
      const profiles = await readJson("profiles.json", {});
      return profiles[wallet] || null;
    },

    async setProfile(wallet, profile) {
      if (usePg) {
        const res = await pool.query(
          `insert into profiles(user_wallet, bio, role, location, avatar_seed, join_date)
           values($1,$2,$3,$4,$5,$6)
           on conflict(user_wallet) do update set
             bio=excluded.bio,
             role=excluded.role,
             location=excluded.location,
             avatar_seed=excluded.avatar_seed,
             join_date=excluded.join_date
           returning user_wallet, bio, role, location, avatar_seed, join_date`,
          [wallet, profile.bio || null, profile.role || null, profile.location || null, profile.avatar_seed || null, profile.join_date || null]
        );
        return res.rows[0];
      }
      const profiles = await readJson("profiles.json", {});
      const next = { ...profiles, [wallet]: profile };
      await writeJson("profiles.json", next);
      return profile;
    },

    async getAttendanceCount(wallet) {
      if (usePg) {
        const res = await pool.query("select count(*)::int as c from attendance where wallet=$1", [wallet]);
        return res.rows[0]?.c || 0;
      }
      const attendance = await readJson("attendance.json", []);
      return attendance.filter((a) => a.wallet === wallet).length;
    },

    async getCommunityMessageCount(wallet) {
      const all = await readJson("community_messages.json", {});
      let count = 0;
      for (const msgs of Object.values(all)) {
        if (!Array.isArray(msgs)) continue;
        count += msgs.filter((m) => m.user === wallet).length;
      }
      return count;
    },

    async getUserByWallet(wallet) {
      if (usePg) {
        const res = await pool.query("select id, wallet, name, email, xp, created_at from users where wallet=$1", [wallet]);
        return res.rows[0] || null;
      }
      const users = await readJson("users.json", []);
      const u = users.find((x) => x.wallet === wallet);
      if (!u) return null;
      const { password_hash, ...safe } = u;
      return safe;
    },

    async getUserWithPassword(wallet) {
      if (usePg) {
        const res = await pool.query("select * from users where wallet=$1", [wallet]);
        return res.rows[0] || null;
      }
      const users = await readJson("users.json", []);
      return users.find((x) => x.wallet === wallet) || null;
    },

    async createClass({ teacher_wallet, title, ipfs_hash }) {
      if (usePg) {
        const res = await pool.query(
          "insert into classes(teacher_wallet, title, ipfs_hash) values($1,$2,$3) returning id, teacher_wallet, title, ipfs_hash, created_at",
          [teacher_wallet, title, ipfs_hash]
        );
        return res.rows[0];
      }
      const classes = await readJson("classes.json", []);
      const row = {
        id: classes.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1,
        teacher_wallet,
        title,
        ipfs_hash,
        created_at: new Date().toISOString(),
      };
      classes.push(row);
      await writeJson("classes.json", classes);
      return row;
    },

    async listClasses() {
      if (usePg) {
        const res = await pool.query("select id, teacher_wallet, title, ipfs_hash, created_at from classes order by id desc");
        return res.rows;
      }
      return await readJson("classes.json", []);
    },

    async markAttendance({ class_id, wallet }) {
      if (usePg) {
        const res = await pool.query(
          "insert into attendance(class_id, wallet) values($1,$2) returning id, class_id, wallet, timestamp",
          [class_id, wallet]
        );
        return res.rows[0];
      }
      const attendance = await readJson("attendance.json", []);
      const row = {
        id: attendance.reduce((m, a) => Math.max(m, a.id || 0), 0) + 1,
        class_id,
        wallet,
        timestamp: new Date().toISOString(),
      };
      attendance.push(row);
      await writeJson("attendance.json", attendance);
      return row;
    },

    async getAttendanceByClass(classId) {
      if (usePg) {
        const res = await pool.query(
          "select id, class_id, wallet, timestamp from attendance where class_id=$1 order by id desc",
          [classId]
        );
        return res.rows;
      }
      const attendance = await readJson("attendance.json", []);
      return attendance.filter((a) => String(a.class_id) === String(classId));
    },

    async rewardTokens({ wallet, amount, tx_hash }) {
      if (usePg) {
        const res = await pool.query(
          "insert into tokens(wallet, amount, tx_hash) values($1,$2,$3) returning id, wallet, amount, tx_hash, created_at",
          [wallet, amount, tx_hash || null]
        );
        return res.rows[0];
      }
      const tokens = await readJson("tokens.json", []);
      const row = {
        id: tokens.reduce((m, t) => Math.max(m, t.id || 0), 0) + 1,
        wallet,
        amount,
        tx_hash: tx_hash || null,
        created_at: new Date().toISOString(),
      };
      tokens.push(row);
      await writeJson("tokens.json", tokens);
      return row;
    },

    async getTokenBalance(wallet) {
      if (usePg) {
        const res = await pool.query("select coalesce(sum(amount),0) as balance from tokens where wallet=$1", [wallet]);
        return parseInt(res.rows[0]?.balance || "0", 10);
      }
      const tokens = await readJson("tokens.json", []);
      return tokens.filter((t) => t.wallet === wallet).reduce((sum, t) => sum + (t.amount || 0), 0);
    },

    async createEnrollRequest(payload) {
      const reqs = await readJson("enroll_requests.json", []);
      const row = {
        id: reqs.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1,
        ...payload,
        created_at: new Date().toISOString(),
      };
      reqs.push(row);
      await writeJson("enroll_requests.json", reqs);
      return row;
    },

    async getContent(name) {
      return await readJson(`${name}.json`, []);
    },

    async setContent(name, content) {
      await writeJson(`${name}.json`, content);
      return content;
    },
  };
}
