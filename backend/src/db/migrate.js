export async function ensureSchema(pool) {
  if (!pool) return;

  await pool.query(`
    create table if not exists users (
      id serial primary key,
      wallet text unique,
      name text,
      email text,
      password_hash text,
      xp integer default 0,
      created_at timestamptz default now()
    );

    create table if not exists classes (
      id serial primary key,
      teacher_wallet text,
      title text,
      ipfs_hash text,
      created_at timestamptz default now()
    );

    create table if not exists attendance (
      id serial primary key,
      class_id integer,
      wallet text,
      timestamp timestamptz default now()
    );

    create table if not exists tokens (
      id serial primary key,
      wallet text,
      amount integer,
      tx_hash text,
      created_at timestamptz default now()
    );

    create table if not exists ai_memory (
      id serial primary key,
      user_wallet text,
      embedding jsonb,
      context jsonb,
      created_at timestamptz default now()
    );

    create table if not exists focus_logs (
      id serial primary key,
      wallet text,
      focus_score numeric,
      timestamp timestamptz default now()
    );

    create table if not exists profiles (
      user_wallet text primary key,
      bio text,
      role text,
      location text,
      avatar_seed text,
      join_date text
    );
  `);
}
