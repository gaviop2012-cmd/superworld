import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { rows, err, verifyPlayer, cleanName } from '../../shared/anonymous.ts';

const VIS = ['public', 'invite', 'private'];
const EVID = ['team', 'public'];
const MAX = 8;
const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const getTeam = (sr: any, id: string) =>
  sr.entities.Team.get(id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
const normalizeMembers = (members: any[]) =>
  (members || []).map((m) => ({ ...m, player_id: m.player_id || m.user_id || '' }));

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const player = await verifyPlayer(base44, body);
    if (!player) return err('Your Player ID could not be verified. Refresh the app and try again.', 401);

    const sr = base44.asServiceRole;
    const playerId = player.player_id;
    const me = { player_id: playerId, username: cleanName(player.username, `Player-${playerId.slice(-4)}`) };
    const { action } = body;

    if (action === 'listMine') {
      const result = await sr.entities.Team.filter({ member_ids: playerId }, { sort: '-created_date', limit: 50 });
      return Response.json({ teams: rows(result) });
    }

    if (action === 'listPublic') {
      const result = await sr.entities.Team.filter({ visibility: { $in: ['public', 'invite'] } }, { sort: '-created_date', limit: 40 });
      return Response.json({ teams: rows(result) });
    }

    if (action === 'create') {
      const name = String(body.name || '').trim().slice(0, 40);
      if (name.length < 3) return err('Team name must be at least 3 characters');
      const visibility = VIS.includes(body.visibility) ? body.visibility : 'public';
      const evidence_visibility = EVID.includes(body.evidence_visibility) ? body.evidence_visibility : 'team';
      const team = await sr.entities.Team.create({
        name, description: String(body.description || '').trim().slice(0, 300), visibility, evidence_visibility,
        owner_id: playerId, owner_username: me.username, member_ids: [playerId],
        members: [{ ...me, role: 'captain' }],
      });
      const code = makeCode();
      await sr.entities.TeamCode.create({ team_id: team.id, owner_id: playerId, code });
      return Response.json({ team, code });
    }

    if (action === 'join') {
      let team: any = null;
      if (body.code) {
        const tc = rows(await sr.entities.TeamCode.filter({ code: String(body.code).trim().toUpperCase() }, { limit: 1 }))[0];
        if (!tc) return err('That invite code does not match any team', 404);
        team = await getTeam(sr, tc.team_id);
      } else {
        team = await getTeam(sr, String(body.team_id || ''));
        if (team && team.visibility !== 'public') return err('This team needs an invite code', 403);
      }
      if (!team) return err('Team not found', 404);
      if ((team.member_ids || []).includes(playerId)) return Response.json({ team });
      if ((team.member_ids || []).length >= MAX) return err('This team is full (max 8 members)', 409);
      const members = normalizeMembers(team.members);
      const updated = await sr.entities.Team.update(team.id, {
        member_ids: [...(team.member_ids || []), playerId],
        members: [...members, { ...me, role: 'member' }],
      });
      return Response.json({ team: updated });
    }

    const team = await getTeam(sr, String(body.team_id || ''));
    if (!team) return err('Team not found', 404);
    const members = normalizeMembers(team.members);
    const isMember = (team.member_ids || []).includes(playerId);
    const isOwner = team.owner_id === playerId;

    if (action === 'get') {
      if (!isMember && team.visibility === 'private') return err('Team not found', 404);
      return Response.json({ team: { ...team, members } , isMember });
    }

    if (action === 'leave') {
      if (!isMember) return err('Not a member', 403);
      const remaining = members.filter((m: any) => m.player_id !== playerId);
      if (!remaining.length) {
        await sr.entities.Team.delete(team.id);
        const codes = rows(await sr.entities.TeamCode.filter({ team_id: team.id }, { limit: 10 }));
        await Promise.all(codes.map((item: any) => sr.entities.TeamCode.delete(item.id)));
        return Response.json({ deleted: true });
      }
      const patch: any = { member_ids: remaining.map((m: any) => m.player_id), members: remaining };
      if (isOwner) {
        remaining[0].role = 'captain';
        patch.owner_id = remaining[0].player_id;
        patch.owner_username = remaining[0].username;
        const tc = rows(await sr.entities.TeamCode.filter({ team_id: team.id }, { limit: 1 }))[0];
        if (tc) await sr.entities.TeamCode.update(tc.id, { owner_id: remaining[0].player_id });
      }
      await sr.entities.Team.update(team.id, patch);
      return Response.json({ left: true });
    }

    if (action === 'kick') {
      if (!isOwner) return err('Only the captain can remove members', 403);
      const targetId = String(body.target_player_id || '');
      if (!targetId || targetId === playerId) return err('Invalid player ID');
      const remaining = members.filter((m: any) => m.player_id !== targetId);
      if (remaining.length === members.length) return err('Player is not in this team', 404);
      await sr.entities.Team.update(team.id, { member_ids: remaining.map((m: any) => m.player_id), members: remaining });
      return Response.json({ ok: true });
    }

    if (action === 'invite') {
      if (!isOwner) return err('Only the captain can invite players', 403);
      const targetId = String(body.target_player_id || '').trim().toUpperCase();
      if (!/^WQ-[A-Z0-9]{12}$/.test(targetId)) return err('Enter a valid Player ID');
      const target = rows(await sr.entities.Player.filter({ player_id: targetId }, { limit: 1 }))[0];
      if (!target) return err('No player found with that Player ID', 404);
      if ((team.member_ids || []).includes(targetId)) return err('That player is already on this team', 409);
      if ((team.member_ids || []).length >= MAX) return err('This team is full (max 8 members)', 409);
      const updated = await sr.entities.Team.update(team.id, {
        member_ids: [...(team.member_ids || []), targetId],
        members: [...members, { player_id: targetId, username: cleanName(target.username, `Player-${targetId.slice(-4)}`), role: 'member' }],
      });
      return Response.json({ team: updated });
    }

    if (action === 'update') {
      if (!isOwner) return err('Only the captain can change settings', 403);
      const patch: any = {};
      if (body.name !== undefined) {
        patch.name = String(body.name || '').trim().slice(0, 40);
        if (patch.name.length < 3) return err('Team name must be at least 3 characters');
      }
      if (body.description !== undefined) patch.description = String(body.description || '').trim().slice(0, 300);
      if (VIS.includes(body.visibility)) patch.visibility = body.visibility;
      if (EVID.includes(body.evidence_visibility)) patch.evidence_visibility = body.evidence_visibility;
      return Response.json({ team: await sr.entities.Team.update(team.id, patch) });
    }

    if (action === 'getCode') {
      if (!isOwner) return err('Only the captain can see the invite code', 403);
      const tc = rows(await sr.entities.TeamCode.filter({ team_id: team.id }, { limit: 1 }))[0];
      return Response.json({ code: tc?.code || '' });
    }

    if (action === 'board') {
      if (!isMember && team.evidence_visibility !== 'public') return err('This evidence board is private to the team', 403);
      const query: any = { team_id: team.id };
      if (body.quest_id) query.quest_id = body.quest_id;
      const [subs, claims, comments] = await Promise.all([
        sr.entities.Submission.filter(query, { sort: '-created_date', limit: 150 }),
        sr.entities.TeamClaim.filter(query, { limit: 100 }),
        sr.entities.TeamComment.filter(query, { sort: '-created_date', limit: 150 }),
      ]);
      return Response.json({ submissions: rows(subs), claims: rows(claims), comments: rows(comments), isMember });
    }

    if (action === 'soloProgress') {
      const submissions = await sr.entities.Submission.filter({ quest_id: String(body.quest_id || ''), player_id: playerId, team_id: '' }, { limit: 100, sort: '-created_date' });
      return Response.json({ submissions: rows(submissions), claims: [], comments: [] });
    }

    if (!isMember) return err('Join the team first', 403);

    if (action === 'claim') {
      const idx = Number(body.clue_index);
      if (!body.quest_id || !(idx >= 1 && idx <= 5)) return err('Invalid claim');
      const existing = rows(await sr.entities.TeamClaim.filter({ team_id: team.id, quest_id: body.quest_id, clue_index: idx }, { limit: 1 }))[0];
      if (body.release) {
        if (existing && (existing.player_id === playerId || isOwner)) await sr.entities.TeamClaim.delete(existing.id);
        return Response.json({ ok: true });
      }
      if (existing && existing.player_id !== playerId) return err(`Already claimed by ${existing.username}`, 409);
      if (!existing) await sr.entities.TeamClaim.create({ team_id: team.id, quest_id: body.quest_id, clue_index: idx, ...me });
      return Response.json({ ok: true });
    }

    if (action === 'comment') {
      const text = String(body.text || '').trim().slice(0, 500);
      if (!text) return err('Write something first');
      const comment = await sr.entities.TeamComment.create({
        team_id: team.id, quest_id: body.quest_id || '', clue_index: Number(body.clue_index) || 0, text, ...me,
      });
      return Response.json({ comment });
    }

    return err('Unknown action');
  } catch (error: any) {
    return err(error.message || 'Team service unavailable', 500);
  }
}
