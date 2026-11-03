export const norm = (s: string = '') =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const nameOf = (u: any) => u?.username || u?.full_name || String(u?.email || 'player').split('@')[0];

export const rows = (r: any) => (Array.isArray(r) ? r : r?.items || []);

export const hasPhrase = (text: string, phrase: string) => {
  const p = norm(phrase);
  return p.length > 0 && (' ' + norm(text) + ' ').includes(' ' + p + ' ');
};

export const clueMatches = (answer: string, keywords: string[]) => {
  const ks = (keywords || []).filter(Boolean);
  if (!ks.length) return false;
  const hit = ks.filter((k) => hasPhrase(answer, k)).length;
  return hit >= Math.max(1, Math.ceil(ks.length * 0.6));
};

export const err = (m: string, s = 400) => Response.json({ error: m }, { status: s });

export const safeUrl = (u: any) => {
  try {
    const x = new URL(String(u));
    return /^https?:$/.test(x.protocol) ? x.toString() : '';
  } catch {
    return '';
  }
};