import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { nameOf, rows, err } from '../../shared/util.ts';

const VIS = ['public', 'invite', 'private'];
const EVID = ['team', 'public'];
const MAX = 8;
const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return err('Unauthorized', 401);
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const sr = base44.asServiceRole;
    const me = { user_id: user.id, username: nameOf(user) };
    const getTeam = (id: string) => sr.entities.Team.get(id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    const clean = (s: any, n: number) => String(s || '').trim().slice(0, n);

    if (action === 'create') {
      const name = clean(body.name, 40);
      if (name.length < 3) return err('Team name must be at least 3 characters');
      const visibility = VIS.includes(body.visibility) ? body.visibility : 'public';
      const evidence_visibility = EVID.includes(body.evidence_visibility) ? body.evidence_visibility : 'team';
      const team = await sr.entities.Team.create({
        name, description: clean(body.description, 300), visibility, evidence_visibility,
        owner_id: user.id, owner_username: me.username, member_ids: [user.id],
        members: [{ ...me, role: 'captain' }],
      });
      const code = makeCode();
      await sr.entities.TeamCode.create({ team_id: team.id, owner_id: user.id, code });
      return Response.json({ team, code });
    }

    if (action === 'join') {
      let team: any = null;
      if (body.code) {
        const tc = rows(await sr.entities.TeamCode.filter({ code: String(body.code).trim().toUpperCase() }, { limit: 1 }))[0];
        if (!tc) return err('That invite code does not match any team', 404);
        team = await getTeam(tc.team_id);
      } else {
        team = await getTeam(body.team_id);
        if (team && team.visibility !== 'public') return err('This team needs an invite code', 403);
      }
      if (!team) return err('Team not found', 404);
      if ((team.member_ids || []).includes(user.id)) return Response.json({ team });
      if ((team.member_ids || []).length >= MAX) return err('This team is full (max 8 members)', 409);
      const updated = await sr.entities.Team.update(team.id, {
        member_ids: [...team.member_ids, user.id],
        members: [...(team.members || []), { ...me, role: 'member' }],
      });
      return Response.json({ team: updated });
    }

    const team = await getTeam(body.team_id);
    if (!team) return err('Team not found', 404);
    const isMember = (team.member_ids || []).includes(user.id);
    const isOwner = team.owner_id === user.id;

    if (action === 'leave') {
      if (!isMember) return err('Not a member', 403);
      const members = team.members.filter((m: any) => m.user_id !== user.id);
      if (!members.length) {
        await sr.entities.Team.delete(team.id);
        return Response.json({ deleted: true });
      }
      const patch: any = { member_ids: members.map((m: any) => m.user_id), members };
      if (isOwner) {
        members[0].role = 'captain';
        patch.owner_id = members[0].user_id;
        patch.owner_username = members[0].username;
        const tc = rows(await sr.entities.TeamCode.filter({ team_id: team.id }, { limit: 1 }))[0];
        if (tc) await sr.entities.TeamCode.update(tc.id, { owner_id: members[0].user_id });
      }
      await sr.entities.Team.update(team.id, patch);
      return Response.json({ left: true });
    }

    if (action === 'kick') {
      if (!isOwner) return err('Only the captain can remove members', 403);
      if (body.user_id === user.id) return err('Use leave instead');
      const members = team.members.filter((m: any) => m.user_id !== body.user_id);
      await sr.entities.Team.update(team.id, { member_ids: members.map((m: any) => m.user_id), members });
      return Response.json({ ok: true });
    }

    if (action === 'update') {
      if (!isOwner) return err('Only the captain can change settings', 403);
      const patch: any = {};
      if (body.name !== undefined) {
        patch.name = clean(body.name, 40);
        if (patch.name.length < 3) return err('Team name must be at least 3 characters');
      }
      if (body.description !== undefined) patch.description = clean(body.description, 300);
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
      const q: any = { team_id: team.id };
      if (body.quest_id) q.quest_id = body.quest_id;
      const [subs, claims, comments] = await Promise.all([
        sr.entities.Submission.filter(q, { sort: '-created_date', limit: 150 }),
        sr.entities.TeamClaim.filter(q, { limit: 100 }),
        sr.entities.TeamComment.filter(q, { sort: '-created_date', limit: 150 }),
      ]);
      return Response.json({ submissions: rows(subs), claims: rows(claims), comments: rows(comments), isMember });
    }

    if (!isMember) return err('Join the team first', 403);

    if (action === 'claim') {
      const idx = Number(body.clue_index);
      if (!body.quest_id || !(idx >= 1 && idx <= 5)) return err('Invalid claim');
      const existing = rows(await sr.entities.TeamClaim.filter({ team_id: team.id, quest_id: body.quest_id, clue_index: idx }, { limit: 1 }))[0];
      if (body.release) {
        if (existing && (existing.user_id === user.id || isOwner)) await sr.entities.TeamClaim.delete(existing.id);
        return Response.json({ ok: true });
      }
      if (existing && existing.user_id !== user.id) return err(`Already claimed by ${existing.username}`, 409);
      if (!existing) await sr.entities.TeamClaim.create({ team_id: team.id, quest_id: body.quest_id, clue_index: idx, ...me });
      return Response.json({ ok: true });
    }

    if (action === 'comment') {
      const text = clean(body.text, 500);
      if (!text) return err('Write something first');
      const c = await sr.entities.TeamComment.create({
        team_id: team.id, quest_id: body.quest_id || '', clue_index: Number(body.clue_index) || 0, text, ...me,
      });
      return Response.json({ comment: c });
    }

    return err('Unknown action');
  } catch (error: any) {
    return err(error.message, 500);
  }
}