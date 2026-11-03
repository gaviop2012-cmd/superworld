import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { rows, err, verifyPlayer, cleanName } from '../../shared/anonymous.ts';

const withoutSystemFields = (value: any) => {
  const copy = { ...(value || {}) };
  for (const key of ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample']) delete copy[key];
  return copy;
};
const getById = (entity: any, id: string) =>
  entity.get(id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const player = await verifyPlayer(base44, body);
    if (!player) return err('Your Player ID could not be verified. Refresh the app and try again.', 401);
    const sr = base44.asServiceRole;
    const playerId = player.player_id;
    const username = cleanName(player.username, `Player-${playerId.slice(-4)}`);
    const action = String(body.action || '');

    if (action === 'listQuests') {
      const filters: any = { status: 'published', visibility: 'public' };
      if (['history','internet','general','science','technology','culture','geography','other'].includes(body.category)) filters.category = body.category;
      if (Number.isInteger(Number(body.difficulty)) && Number(body.difficulty) >= 1 && Number(body.difficulty) <= 5) filters.difficulty = Number(body.difficulty);
      const search = String(body.search || '').trim().slice(0, 80);
      if (search) filters.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      const result = await sr.entities.Quest.filter(filters, { sort: 'difficulty', limit: 100 });
      return Response.json({ quests: rows(result) });
    }

    if (action === 'getQuest') {
      const quest = await getById(sr.entities.Quest, String(body.quest_id || ''));
      if (!quest || (quest.status !== 'published' && quest.creator_player_id !== playerId)) return err('Quest not found', 404);
      if (quest.visibility === 'private' && quest.creator_player_id !== playerId) return err('This quest is private', 403);
      return Response.json({ quest });
    }

    if (action === 'myQuests') {
      const result = await sr.entities.Quest.filter({ creator_player_id: playerId }, { sort: '-updated_date', limit: 100 });
      return Response.json({ quests: rows(result) });
    }

    if (action === 'loadEditor') {
      const questId = String(body.quest_id || '');
      const quest = await getById(sr.entities.Quest, questId);
      if (!quest || quest.creator_player_id !== playerId) return err('Quest not found', 404);
      const keys = rows(await sr.entities.QuestKey.filter({ quest_id: questId }, { limit: 1 }));
      return Response.json({ quest, key: keys[0] || null });
    }

    if (action === 'saveQuest') {
      const incoming = withoutSystemFields(body.quest);
      if (!String(incoming.title || '').trim()) return err('Quest title is required');
      const questId = String(body.quest_id || '');
      let quest: any;
      if (questId) {
        const existing = await getById(sr.entities.Quest, questId);
        if (!existing || existing.creator_player_id !== playerId) return err('You can only edit your own quests', 403);
        quest = await sr.entities.Quest.update(questId, {
          ...incoming, creator_player_id: playerId, creator_username: username,
        });
      } else {
        quest = await sr.entities.Quest.create({
          ...incoming, creator_player_id: playerId, creator_username: username,
        });
      }
      const keyData = withoutSystemFields(body.key);
      if (keyData.final_answer || keyData.clue_keys?.length) {
        const existingKeys = rows(await sr.entities.QuestKey.filter({ quest_id: quest.id }, { limit: 1 }));
        if (existingKeys.length) await sr.entities.QuestKey.update(existingKeys[0].id, keyData);
        else await sr.entities.QuestKey.create({ quest_id: quest.id, ...keyData });
      }
      return Response.json({ quest_id: quest.id, quest });
    }

    if (action === 'deleteQuest') {
      const questId = String(body.quest_id || '');
      const quest = await getById(sr.entities.Quest, questId);
      if (!quest || quest.creator_player_id !== playerId) return err('You can only delete your own quests', 403);
      const keys = rows(await sr.entities.QuestKey.filter({ quest_id: questId }, { limit: 10 }));
      await Promise.all(keys.map((key: any) => sr.entities.QuestKey.delete(key.id)));
      await sr.entities.Quest.delete(questId);
      return Response.json({ deleted: true });
    }

    if (action === 'soloProgress') {
      const submissions = rows(await sr.entities.Submission.filter({
        quest_id: String(body.quest_id || ''), player_id: playerId, team_id: '',
      }, { limit: 100, sort: '-created_date' }));
      return Response.json({ submissions });
    }

    if (action === 'feedbackList') {
      const feedback = rows(await sr.entities.QuestFeedback.filter({ quest_id: String(body.quest_id || '') }, { limit: 200 }));
      return Response.json({ feedback });
    }

    if (action === 'feedbackCreate') {
      const questId = String(body.quest_id || '');
      const rating = Number(body.rating);
      if (!questId || !Number.isInteger(rating) || rating < 1 || rating > 5) return err('Choose a rating between 1 and 5');
      const feedback = await sr.entities.QuestFeedback.create({
        quest_id: questId, player_id: playerId, rating,
        clarity: ['clear','okay','confusing'].includes(body.clarity) ? body.clarity : 'clear',
        difficulty_feel: ['easier','accurate','harder'].includes(body.difficulty_feel) ? body.difficulty_feel : 'accurate',
        broken_link: !!body.broken_link, comment: String(body.comment || '').slice(0, 500),
      });
      return Response.json({ feedback });
    }

    if (action === 'stats') {
      const [clues, finals, made] = await Promise.all([
        sr.entities.Submission.count({ player_id: playerId, kind: 'clue', correct: true }),
        sr.entities.Submission.count({ player_id: playerId, kind: 'final', correct: true }),
        sr.entities.Quest.count({ creator_player_id: playerId, status: 'published' }),
      ]);
      return Response.json({ clues, finals, made });
    }

    return err('Unknown action');
  } catch (error: any) {
    return err(error.message || 'WorldQuest service unavailable', 500);
  }
}
