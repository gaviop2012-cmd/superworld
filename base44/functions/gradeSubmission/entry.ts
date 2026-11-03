import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { nameOf, rows, hasPhrase, clueMatches, err, safeUrl } from '../../shared/util.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return err('Unauthorized', 401);
    const { quest_id, kind, clue_index, answer, source_url, team_id } = await req.json().catch(() => ({}));
    const text = String(answer || '').trim();
    if (!quest_id || !['clue', 'final'].includes(kind)) return err('Invalid request');
    if (text.length < 2 || text.length > 2000) return err('Answer must be between 2 and 2000 characters');
    const idx = kind === 'final' ? 0 : Number(clue_index);
    if (kind === 'clue' && !(idx >= 1 && idx <= 5)) return err('Invalid clue');

    const sr = base44.asServiceRole;
    const quest = await sr.entities.Quest.get(quest_id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    const isOwner = quest && quest.created_by_id === user.id;
    if (!quest || (quest.status !== 'published' && !isOwner)) return err('Quest not found', 404);
    if (quest.visibility === 'private' && !isOwner) return err('This quest is private', 403);

    let team: any = null;
    if (team_id) {
      team = await sr.entities.Team.get(team_id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
      if (!team || !(team.member_ids || []).includes(user.id)) return err('You are not on that team', 403);
    }
    const scope = team ? { quest_id, team_id } : { quest_id, user_id: user.id, team_id: '' };

    const keys = rows(await sr.entities.QuestKey.filter({ quest_id }, { limit: 1 }));
    const key = keys[0];
    if (!key) return err('This quest has no answer key yet', 409);

    const already = rows(await sr.entities.Submission.filter({ ...scope, kind, clue_index: idx, correct: true }, { limit: 1 }));
    if (already.length) return Response.json({ correct: true, already: true, message: 'Already solved.' });

    if (kind === 'final') {
      const solved = rows(await sr.entities.Submission.filter({ ...scope, kind: 'clue', correct: true }, { limit: 50 }));
      const got = new Set(solved.map((s: any) => s.clue_index));
      if (![1, 2, 3, 4, 5].every((n) => got.has(n))) return err('Solve all five clues with evidence before the final answer', 409);
    }

    const recent = rows(await sr.entities.Submission.filter({ quest_id, user_id: user.id, kind, clue_index: idx, correct: false }, { sort: '-created_date', limit: 8 }));
    if (recent.length >= 8 && Date.now() - new Date(recent[7].created_date).getTime() < 60000) {
      return err('Too many attempts. Wait a minute and try again.', 429);
    }

    let correct = false;
    if (kind === 'final') {
      const accepted = [key.final_answer, ...(key.aliases || [])].filter(Boolean);
      correct = accepted.some((a: string) => hasPhrase(text, a));
    } else {
      correct = clueMatches(text, key.clue_keys?.[idx - 1]?.keywords || []);
    }

    await sr.entities.Submission.create({
      quest_id, team_id: team ? team_id : '', user_id: user.id, username: nameOf(user),
      kind, clue_index: idx, text, source_url: safeUrl(source_url), correct,
    });

    const ck = key.clue_keys?.[idx - 1];
    return Response.json({
      correct,
      message: correct ? 'Evidence accepted.' : 'Not quite. Re-read the clue and check your source for the exact detail.',
      finding: correct && kind === 'clue' ? ck?.finding || '' : undefined,
      contribution: correct && kind === 'clue' ? ck?.contribution || '' : undefined,
      explanation: correct && kind === 'final' ? key.explanation || '' : undefined,
    });
  } catch (error: any) {
    return err(error.message, 500);
  }
}