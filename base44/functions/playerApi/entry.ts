import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { rows, err, hashPlayerSecret, cleanName, verifyPlayer } from '../../shared/anonymous.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'register';
    const playerId = String(body.player_id || '');
    const secret = String(body.player_secret || '');
    const sr = base44.asServiceRole;

    if (action === 'register') {
      if (!/^WQ-[A-Z0-9]{12}$/.test(playerId) || !/^[a-f0-9]{64}$/.test(secret)) return err('Invalid player identity');
      const hash = await hashPlayerSecret(secret);
      const existing = rows(await sr.entities.Player.filter({ player_id: playerId }, { limit: 1 }))[0];
      if (existing && existing.secret_hash !== hash) return err('This Player ID is already registered on another device', 409);
      const username = cleanName(body.username, `Player-${playerId.slice(-4)}`);
      const player = existing || await sr.entities.Player.create({ player_id: playerId, username, secret_hash: hash });
      if (existing && body.username && existing.username !== username) await sr.entities.Player.update(existing.id, { username });
      return Response.json({ player: { player_id: player.player_id, username: existing ? username : player.username } });
    }

    const player = await verifyPlayer(base44, body);
    if (!player) return err('Player identity not found. Refresh this page to create a new Player ID.', 401);
    if (action === 'updateName') {
      const username = cleanName(body.username);
      if (username.length < 3) return err('Player name must be at least 3 characters');
      const updated = await sr.entities.Player.update(player.id, { username });
      return Response.json({ player: { player_id: updated.player_id, username: updated.username } });
    }
    return err('Unknown action');
  } catch (error: any) {
    return err(error.message || 'Player service unavailable', 500);
  }
}
