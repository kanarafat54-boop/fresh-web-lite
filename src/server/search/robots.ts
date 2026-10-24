/** Minimal RFC 9309 robots.txt evaluation: longest-match Allow/Disallow with * and $ wildcards. */
export interface RobotsRules { groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }>; crawlDelay?: number }> }

export function parseRobots(text: string): RobotsRules {
  const groups: RobotsRules["groups"] = [];
  let current: RobotsRules["groups"][number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") current.rules.push({ allow: key === "allow", path: value });
    else if (key === "crawl-delay") { const n = Number(value); if (Number.isFinite(n) && n >= 0) current.crawlDelay = n; }
  }
  return { groups };
}

function matchLength(pattern: string, path: string): number {
  if (pattern === "") return -1;
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path) ? body.length : -1;
}

export function selectGroup(rules: RobotsRules, agent: string) {
  const a = agent.toLowerCase();
  let best: { score: number; group: RobotsRules["groups"][number] } | null = null;
  for (const group of rules.groups) for (const g of group.agents) {
    const score = g === "*" ? 0 : a.includes(g) ? g.length : -1;
    if (score >= 0 && (!best || score > best.score)) best = { score, group };
  }
  return best?.group ?? null;
}

export function isAllowed(rules: RobotsRules, agent: string, pathWithQuery: string): boolean {
  const group = selectGroup(rules, agent);
  if (!group) return true;
  let bestLen = -1; let allow = true;
  for (const r of group.rules) {
    const len = matchLength(r.path, pathWithQuery);
    if (len > bestLen || (len === bestLen && len >= 0 && r.allow)) { bestLen = len; allow = r.allow; }
  }
  return bestLen < 0 ? true : allow;
}
