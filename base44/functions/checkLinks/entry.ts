import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { err, safeUrl } from '../../shared/util.ts';

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)|\.(internal|local|localhost)$/i;

async function check(url: string) {
  const u = safeUrl(url);
  if (!u) return { url, ok: false, status: 0, note: 'Not a valid http(s) URL' };
  const host = new URL(u).hostname;
  if (PRIVATE_HOST.test(host)) return { url, ok: false, status: 0, note: 'Private addresses are not allowed' };
  try {
    const res = await fetch(u, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'WorldQuestLinkChecker/1.0', Accept: 'text/html,*/*' },
    });
    const blocked = [401, 403, 405, 429, 999].includes(res.status);
    return {
      url, status: res.status, final_url: res.url, redirected: res.url !== u,
      ok: res.ok, blocked,
      note: res.ok ? 'Loads' : blocked ? 'Site blocks automated checks - verify by hand' : `HTTP ${res.status}`,
    };
  } catch (e: any) {
    return { url, ok: false, status: 0, note: 'Could not reach this address' };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return err('Unauthorized', 401);
    const { urls } = await req.json().catch(() => ({}));
    if (!Array.isArray(urls) || !urls.length) return err('urls required');
    const list = [...new Set(urls.map(String))].slice(0, 20);
    const results: any[] = [];
    for (let i = 0; i < list.length; i += 6) {
      results.push(...(await Promise.all(list.slice(i, i + 6).map(check))));
    }
    return Response.json({ results });
  } catch (error: any) {
    return err(error.message, 500);
  }
}