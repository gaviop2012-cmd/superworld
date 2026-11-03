const STORAGE_KEY = "worldquest_player_v1";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makePlayerId() {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return "WQ-" + Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

function createIdentity() {
  const id = makePlayerId();
  return { id, player_id: id, username: `Player-${id.slice(-4)}`, custom_name: false };
}

export function getPlayerIdentity() {
  if (typeof window === "undefined") return { id: "WQ-LOCALPLAYER", player_id: "WQ-LOCALPLAYER", username: "Player", custom_name: false };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved.id === "string" && /^WQ-[A-Z0-9]{8,16}$/.test(saved.id)) {
      const username = typeof saved.username === "string" && saved.username.trim()
        ? saved.username.trim()
        : `Player-${saved.id.slice(-4)}`;
      return { ...saved, id: saved.id, player_id: saved.id, username, custom_name: !!saved.custom_name };
    }
  } catch {
    // A blocked or malformed local-storage entry is replaced with a fresh local identity.
  }
  const created = createIdentity();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
  } catch {
    // Gameplay still works for this tab; persistence requires browser storage to be available.
  }
  return created;
}

export function updatePlayerUsername(username) {
  const current = getPlayerIdentity();
  const updated = { ...current, username, custom_name: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // The current page can still use the updated in-memory identity.
  }
  return updated;
}

export function playerPayload() {
  const player = getPlayerIdentity();
  return { player_id: player.id, username: player.username };
}
