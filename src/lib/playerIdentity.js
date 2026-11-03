const STORAGE_KEY = "worldquest_player_v1";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

function makeIdentity() {
  const id = `WQ-${randomChars(12)}`;
  const secretBytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(secretBytes);
  else for (let i = 0; i < secretBytes.length; i++) secretBytes[i] = Math.floor(Math.random() * 256);
  const secret = Array.from(secretBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { id, player_id: id, player_secret: secret, username: `Player-${id.slice(-4)}`, custom_name: false };
}

export function getPlayerIdentity() {
  if (typeof window === "undefined") return { id: "WQ-LOCALPLAYER", player_id: "WQ-LOCALPLAYER", player_secret: "", username: "Player", custom_name: false };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved.id === "string" && /^WQ-[A-Z0-9]{12}$/.test(saved.id) &&
        typeof saved.player_secret === "string" && /^[a-f0-9]{64}$/.test(saved.player_secret)) {
      const username = typeof saved.username === "string" && saved.username.trim() ? saved.username.trim() : `Player-${saved.id.slice(-4)}`;
      return { ...saved, id: saved.id, player_id: saved.id, username, custom_name: !!saved.custom_name };
    }
  } catch {
    // Replace malformed local identity data with a fresh identity.
  }
  const created = makeIdentity();
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created)); }
  catch { /* The player can play in this tab, but cannot retain identity without browser storage. */ }
  return created;
}

export function updatePlayerUsername(username) {
  const current = getPlayerIdentity();
  const updated = { ...current, username, custom_name: true };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
  catch { /* The current page can still use this updated identity. */ }
  return updated;
}
