import { readJson } from "../storage/jsonStore.js";

async function seedUsers(pool) {
  const users = await readJson("users.json", []);
  for (const u of users) {
    await pool.query(
      `insert into users(wallet, name, email, password_hash, xp, created_at)
       values($1,$2,$3,$4,$5,$6)
       on conflict(wallet) do update set
         name=excluded.name,
         email=excluded.email,
         password_hash=coalesce(excluded.password_hash, users.password_hash),
         xp=coalesce(excluded.xp, users.xp)`,
      [u.wallet, u.name || null, u.email || null, u.password_hash || null, u.xp ?? 0, u.created_at || new Date().toISOString()]
    );
  }
}

async function seedClasses(pool) {
  const classes = await readJson("classes.json", []);
  for (const c of classes) {
    await pool.query(
      `insert into classes(id, teacher_wallet, title, ipfs_hash, created_at)
       values($1,$2,$3,$4,$5)
       on conflict(id) do nothing`,
      [c.id, c.teacher_wallet || null, c.title || null, c.ipfs_hash || null, c.created_at || new Date().toISOString()]
    );
  }
}

async function seedAttendance(pool) {
  const rows = await readJson("attendance.json", []);
  for (const a of rows) {
    await pool.query(
      `insert into attendance(id, class_id, wallet, timestamp)
       values($1,$2,$3,$4)
       on conflict(id) do nothing`,
      [a.id, a.class_id || null, a.wallet || null, a.timestamp || new Date().toISOString()]
    );
  }
}

async function seedTokens(pool) {
  const rows = await readJson("tokens.json", []);
  for (const t of rows) {
    await pool.query(
      `insert into tokens(id, wallet, amount, tx_hash, created_at)
       values($1,$2,$3,$4,$5)
       on conflict(id) do nothing`,
      [t.id, t.wallet || null, t.amount ?? 0, t.tx_hash || null, t.created_at || new Date().toISOString()]
    );
  }
}

export async function seedFromJson(pool) {
  if (!pool) return;
  await seedUsers(pool);
  await seedClasses(pool);
  await seedAttendance(pool);
  await seedTokens(pool);
}
