export const rows = (r: any) => (Array.isArray(r) ? r : r?.items || []);
export const err = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function hashPlayerSecret(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPlayer(base44: any, body: any) {
  const playerId = String(body?.player_id || "");
  const secret = String(body?.player_secret || "");
  if (!/^WQ-[A-Z0-9]{12}$/.test(playerId) || !/^[a-f0-9]{64}$/.test(secret)) return null;
  const found = rows(await base44.asServiceRole.entities.Player.filter({ player_id: playerId }, { limit: 1 }))[0];
  if (!found) return null;
  const suppliedHash = await hashPlayerSecret(secret);
  if (suppliedHash !== found.secret_hash) return null;
  return found;
}

export function cleanName(value: any, fallback = "Player") {
  const name = String(value || "").replace(/[<>\r\n]/g, "").trim().slice(0, 24);
  return name || fallback;
}
