// Quest Doctor: deterministic quality checks for a quest draft.
export const norm = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export const isUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
const has = (text, phrase) => { const p = norm(phrase); return p.length > 0 && (" " + norm(text) + " ").includes(" " + p + " "); };
const VAGUE = ["hidden connection", "find out what happened", "discover who was involved", "figure it out", "something interesting"];
const ACTION = /\b(open|search|find|identify|read|compare|locate|name|list|check|give|state|explain|record|describe|count|calculate|use|inspect|determine|visit|trace|measure|distinguish)\b/i;
const UNSAFE = /(doxx|stalk|home address|private account|leaked|stolen data|trespass|break into|hack into|bypass (the )?security|follow (him|her|them)|approach (a )?strangers?|phone number of)/i;
const POINTS = { clarity: 20, sources: 20, necessity: 25, final: 15, links: 10, safety: 10 };
export const GROUP_LABELS = {
  clarity: "Clue clarity", sources: "Sources & evidence", necessity: "Five-clue necessity & leakage",
  final: "Final answer", links: "Link stability", safety: "Safety & rights",
};

const tokens = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 3));
const jaccard = (a, b) => { const i = [...a].filter((x) => b.has(x)).length; const u = new Set([...a, ...b]).size; return u ? i / u : 0; };

export function allUrls(f) {
  return [...new Set(f.clues.flatMap((c) => [c.start_url, ...splitLines(c.sources)]).filter(isUrl))];
}
export const splitLines = (s) => (Array.isArray(s) ? s : String(s || "").split("\n")).map((x) => x.trim()).filter(Boolean);
export const splitList = (s) => (Array.isArray(s) ? s : String(s || "").split(/[,;\n]/)).map((x) => x.trim()).filter(Boolean);

export function runDoctor(f, linkResults) {
  const checks = [];
  const add = (group, status, label, detail, fix) => checks.push({ group, status, label, detail, fix, critical: status === "fail" });
  const q = f.quest;
  const finalAns = f.key.final_answer || "";
  const reasoning = f.key.explanation || "";

  // Clarity
  add("clarity", q.head_question?.trim().length > 10 ? "pass" : "fail", "One main question",
    q.head_question?.trim() ? "A head question is set." : "No head question yet.", "Write a single clear mystery question.");
  if (q.head_question && !q.head_question.trim().endsWith("?")) add("clarity", "warn", "Question wording", "The head question does not end with a question mark.", "Phrase it as one answerable question.");
  add("clarity", q.briefing?.trim().length > 30 ? "pass" : "warn", "Briefing", q.briefing?.trim().length > 30 ? "Briefing present." : "Briefing is missing or very short.", "Add 2-3 sentences of context.");
  f.clues.forEach((c, i) => {
    const n = i + 1;
    add("clarity", isUrl(c.start_url) ? "pass" : "fail", `Clue ${n} starting point`, isUrl(c.start_url) ? "Starting URL given." : "No valid starting URL.", "Add a specific http(s) starting page.");
    const ok = c.instruction.trim().length >= 40 && ACTION.test(c.instruction);
    add("clarity", ok ? "pass" : "fail", `Clue ${n} instruction`, ok ? "States a concrete action." : "Too short or no concrete action verb.", "Say exactly where to look and what to do (open, search, compare, identify...).");
    const vague = VAGUE.find((v) => c.instruction.toLowerCase().includes(v));
    if (vague) add("clarity", "warn", `Clue ${n} vague phrase`, `"${vague}" is cryptic.`, "Replace with a precise task.");
    if (!c.submission_format.trim()) add("clarity", "warn", `Clue ${n} submission format`, "Players are not told what to enter.", "Say what to submit (date, name, short explanation).");
  });

  // Sources
  f.clues.forEach((c, i) => {
    const n = i + 1;
    const srcs = splitLines(c.sources);
    add("sources", srcs.length && srcs.every(isUrl) ? "pass" : "fail", `Clue ${n} evidence sources`, srcs.length ? (srcs.every(isUrl) ? `${srcs.length} source(s).` : "A source line is not a valid URL.") : "No source URLs.", "List at least one exact page that supports the discovery.");
    if (srcs.some((s) => s.startsWith("http://"))) add("sources", "warn", `Clue ${n} insecure link`, "A source uses http.", "Prefer https links.");
    const kw = splitList(c.keywords);
    add("sources", kw.length && c.finding.trim() ? "pass" : "fail", `Clue ${n} expected discovery`, kw.length ? "Expected finding and accepted keywords set." : "Missing expected finding or keywords.", "Enter the exact finding and 1+ keywords an answer must contain.");
    add("sources", c.evidence_excerpt.trim() ? "pass" : "warn", `Clue ${n} evidence excerpt`, c.evidence_excerpt.trim() ? "Excerpt recorded." : "No excerpt, so a reviewer cannot check it if the page changes.", "Paste a short quote or locator and the date you checked.");
  });

  // Necessity, distinctness, leakage
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    const a = f.clues[i], b = f.clues[j];
    const dup = (norm(a.finding) && norm(a.finding) === norm(b.finding)) || jaccard(tokens(a.instruction), tokens(b.instruction)) > 0.8;
    if (dup) add("necessity", "fail", `Clues ${i + 1} and ${j + 1} overlap`, "They establish the same evidence.", "Make each clue yield a distinct discovery.");
  }
  if (!checks.some((c) => c.group === "necessity")) add("necessity", "pass", "Distinct clues", "No duplicate clues detected.");
  f.clues.forEach((c, i) => {
    const n = i + 1;
    const used = splitList(c.keywords).some((k) => has(reasoning, k));
    add("necessity", used ? "pass" : "fail", `Clue ${n} used in final reasoning`, used ? "Final reasoning relies on this clue." : "Final reasoning never uses this clue, so removing it would not weaken the proof.", "Mention this clue's discovery in the final reasoning, or replace the clue.");
    if (!c.contribution.trim()) add("necessity", "warn", `Clue ${n} contribution`, "No explanation of how it feeds the answer.", "Explain how this discovery contributes.");
    if (finalAns && norm(finalAns).length >= 4) {
      const leak = has(`${c.title} ${c.instruction}`, finalAns);
      add("necessity", leak ? "fail" : "pass", `Clue ${n} answer leakage`, leak ? "The clue text contains the final answer." : "Clue text does not reveal the answer.", "Remove the answer from the clue wording.");
      if (norm(c.finding) === norm(finalAns)) add("necessity", "fail", `Clue ${n} equals the final answer`, "The clue discovery is the final answer.", "Make the final answer need the combination of clues.");
      if (has(c.start_url, finalAns.replace(/\s+/g, "-")) ) add("necessity", "warn", `Clue ${n} URL hint`, "The starting URL contains the answer.", "Use a less revealing start page.");
    }
    if (c.hint1 && splitList(c.keywords).some((k) => has(c.hint1, k))) add("necessity", "warn", `Clue ${n} hint 1 too direct`, "The gentle hint contains an accepted keyword.", "Make hint 1 a nudge, not the answer.");
  });

  // Final answer
  add("final", finalAns.trim() ? "pass" : "fail", "Final answer set", finalAns.trim() ? "Answer set." : "No final answer.", "Enter the canonical answer.");
  add("final", splitList(f.key.aliases).length ? "pass" : "warn", "Answer variants", splitList(f.key.aliases).length ? "Variants defined." : "No accepted variants. Spellings and aliases may be rejected.", "Add aliases, short forms and alternate spellings.");
  add("final", reasoning.trim().length >= 60 ? "pass" : "fail", "Reasoning explains the proof", reasoning.trim().length >= 60 ? "Explanation present." : "Explanation is too short.", "Explain how all five discoveries combine.");

  // Links
  if (!linkResults) add("links", "warn", "Links not checked yet", "Run the link checker.", "Click Run Quest Doctor to check every URL.");
  else allUrls(f).forEach((u) => {
    const r = linkResults[u];
    if (!r) add("links", "warn", u, "Not checked.", "");
    else if (r.ok) add("links", "pass", u, r.redirected ? "Loads (redirects)." : "Loads.");
    else if (r.blocked) add("links", "warn", u, r.note, "Verify manually and add a backup source.");
    else add("links", "fail", u, r.note, "Fix or replace this link.");
  });

  // Safety
  const everything = [q.title, q.briefing, q.head_question, ...f.clues.map((c) => c.instruction + " " + c.title)].join(" ");
  const bad = everything.match(UNSAFE);
  add("safety", bad ? "fail" : "pass", "No unsafe tasks", bad ? `Found "${bad[0]}".` : "No doxxing, stalking, hacking or trespassing language found.", "Remove tasks that target private people, accounts or places.");
  add("safety", f.key.rights_ack ? "pass" : "fail", "Rights and accuracy confirmed", f.key.rights_ack ? "Creator confirmed." : "Not confirmed.", "Tick the confirmation: you are responsible for accuracy and rights.");

  const score = Math.round(Object.entries(POINTS).reduce((sum, [g, pts]) => {
    const list = checks.filter((c) => c.group === g);
    if (!list.length) return sum;
    const v = list.reduce((s, c) => s + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
    return sum + (pts * v) / list.length;
  }, 0));
  const critical = checks.filter((c) => c.critical);
  return { checks, score, critical, canPublish: critical.length === 0 && score >= 70 };
}