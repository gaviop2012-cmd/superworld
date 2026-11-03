export const CATEGORIES = [
  ["history", "History"], ["internet", "Internet Mystery"], ["general", "General Knowledge"],
  ["science", "Science"], ["technology", "Technology"], ["culture", "Culture"],
  ["geography", "Geography"], ["other", "Other"],
];
export const catLabel = (v) => (CATEGORIES.find((c) => c[0] === v) || [v, v])[1];
export const LEVELS = { 1: "Beginner", 2: "Easy", 3: "Intermediate", 4: "Hard", 5: "Expert" };
export const QUEST_VIS = [
  ["public", "Public", "Listed in Discover for everyone"],
  ["unlisted", "Unlisted", "Anyone with the link can play; not listed"],
  ["private", "Private", "Only you can see and play it"],
];
export const TEAM_VIS = [
  ["public", "Open", "Listed; anyone can join"],
  ["invite", "Invite-only", "Listed; joining needs the invite code"],
  ["private", "Hidden", "Not listed; joining needs the invite code"],
];
export const EVIDENCE_VIS = [
  ["team", "Team only", "Only members see the evidence board"],
  ["public", "Public", "Anyone can view the evidence board, read-only"],
];
export const REVEAL = [
  ["all", "All five clues at once", "Teams can split the research"],
  ["sequential", "One at a time", "Each clue unlocks after the previous is solved"],
];
export const REPORT_REASONS = [
  ["broken_link", "A source link is broken"], ["factual_error", "Factual error"],
  ["unsafe", "Unsafe or harmful task"], ["rights", "Rights or copyright problem"],
  ["spoiler_leak", "A clue gives away the answer"], ["spam", "Spam"], ["other", "Something else"],
];
const RANKS = [[0, "Rookie"], [50, "Sleuth"], [150, "Detective"], [400, "Inspector"], [800, "Chief Investigator"]];
export const rankFor = (xp) => [...RANKS].reverse().find((r) => xp >= r[0])[1];
export const nextRank = (xp) => RANKS.find((r) => r[0] > xp) || null;
export const xpOf = (clues, finals) => clues * 10 + finals * 50;