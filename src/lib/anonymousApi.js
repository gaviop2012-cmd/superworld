import { base44 } from "@/api/base44Client";
import { getPlayerIdentity } from "@/lib/playerIdentity";

export function playerPayload() {
  const player = getPlayerIdentity();
  return { player_id: player.id, player_secret: player.player_secret, username: player.username };
}

export async function callApi(functionName, payload = {}) {
  const response = await base44.functions.invoke(functionName, { ...playerPayload(), ...payload });
  return response.data;
}

export async function registerPlayer() {
  return callApi("playerApi", { action: "register" });
}
