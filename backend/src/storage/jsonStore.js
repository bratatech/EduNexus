import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export async function readJson(fileName, fallback) {
  await ensureDir();
  const p = path.join(dataDir, fileName);
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    if (fallback !== undefined) {
      await writeJson(fileName, fallback);
      return fallback;
    }
    throw e;
  }
}

export async function writeJson(fileName, data) {
  await ensureDir();
  const p = path.join(dataDir, fileName);
  const tmp = p + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, p);
}
