import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { rows, err, verifyPlayer } from '../../shared/anonymous.ts';

const REASONS = ['broken_link', 'factual_error', 'unsafe', 'rights', 'spoiler_leak', 'spam', 'other'];
const UNLIST_AT = 3;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const player = await verifyPlayer(base44, body);
    if (!player) return err('Your Player ID could not be verified. Refresh the app and try again.', 401);
    const { quest_id, reason, details } = body;
    if (!quest_id || !REASONS.includes(reason)) return err('Invalid report');
    const sr = base44.asServiceRole;
    const quest = await sr.entities.Quest.get(quest_id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!quest) return err('Quest not found', 404);
    if (quest.creator_player_id === player.player_id) return err('You cannot report your own quest');
    const mine = rows(await sr.entities.QuestReport.filter({ quest_id, player_id: player.player_id }, { limit: 1 }));
    if (mine.length) return Response.json({ ok: true, duplicate: true });
    await sr.entities.QuestReport.create({
      quest_id, player_id: player.player_id, user_id: '', reason, details: String(details || '').slice(0, 500),
    });
    const count = await sr.entities.QuestReport.count({ quest_id });
    const patch: any = { report_count: count };
    const unlisted = count >= UNLIST_AT && quest.status === 'published';
    if (unlisted) patch.status = 'under_review';
    await sr.entities.Quest.update(quest_id, patch);
    return Response.json({ ok: true, unlisted });
  } catch (error: any) {
    return err(error.message || 'Could not submit report', 500);
  }
}
