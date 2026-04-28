import { readJson, writeJson } from "../storage/jsonStore.js";

export async function getProfileJson(wallet) {
  const all = await readJson("profiles.json", {});
  return all[wallet] || null;
}

export async function setProfileJson(wallet, profile) {
  const all = await readJson("profiles.json", {});
  const next = { ...all, [wallet]: profile };
  await writeJson("profiles.json", next);
  return profile;
}
