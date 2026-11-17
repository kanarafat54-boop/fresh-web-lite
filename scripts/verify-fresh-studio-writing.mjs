import assert from "node:assert/strict";
const base = "../src/features/fresh-studio/";
const W = await import(base + "writing-studio/writingDoc.ts");
const P = await import(base + "shared/projectSettings.ts");
const N = await import(base + "shared/studioNav.ts");
const I = await import("../src/features/fresh-flow/core/freshFlowStudioIntegration.ts");

assert.ok(N.hasStudioEditor("custom"));
// round trip through project settings; old custom projects (no draft keys) still validate and read as empty
assert.deepEqual(W.readDraft({}), { title: "", body: "", sources: "" });
assert.equal(P.validateSettings("custom", {}).ok, true);
const d = { title: "Hello", body: "# Intro\nSome words here.", sources: "Paper | https://example.org/a" };
const merged = P.mergeSettings("custom", P.defaultSettingsFor("custom"), W.toSettings(d));
assert.ok(merged.ok);
assert.deepEqual(W.readDraft(merged.settings), d);
assert.equal(P.mergeSettings("custom", {}, { draftBody: "x".repeat(30001) }).ok, false, "body is capped");
assert.equal(P.mergeSettings("custom", {}, { draftTitle: "x".repeat(201) }).ok, false);

// counting
assert.equal(W.countWords("It's a well-known fact, 42 times."), 6);
assert.equal(W.countWords("   "), 0);
assert.equal(W.readingMinutes(0), 0);
assert.equal(W.readingMinutes(1), 1);
assert.equal(W.readingMinutes(1000), 5);
assert.deepEqual(W.outline("# A\ntext\n## B ##\n#### too deep\n#nospace"), [{ level: 1, text: "A" }, { level: 2, text: "B" }]);

// sources: only http(s); javascript: and garbage are reported, not kept
const s = W.parseSources("Good | https://a.example/x\nhttp://b.example\nBad | javascript:alert(1)\nnot a url\n\n");
assert.deepEqual(s.sources, [{ title: "Good", url: "https://a.example/x" }, { title: "http://b.example", url: "http://b.example" }]);
assert.equal(s.invalid.length, 2);
assert.equal(W.parseSources(Array.from({ length: 40 }, (_, i) => `https://e.example/${i}`).join("\n")).sources.length, W.MAX_SOURCES);

// checks: news and research need a source, a post does not; capability comes from the real profile
const needs = (id) => I.getFreshFlowStudioProfile(id).capabilities.includes("source-attribution");
assert.equal(needs("fresh-news"), true);
assert.equal(needs("research-knowledge"), true);
assert.equal(needs("fresh-posts"), false);
const long = { title: "T", body: "word ".repeat(30), sources: "" };
assert.equal(W.preflight(long, false).every((c) => c.ok), true);
assert.equal(W.preflight(long, true).every((c) => c.ok), false, "news without a source is not ready");
assert.equal(W.preflight({ ...long, title: " " }, false).every((c) => c.ok), false);
assert.equal(W.preflight({ ...long, sources: "oops" }, false).every((c) => c.ok), false);
assert.equal(W.starterFor("fresh-news").includes("## What happened"), true);
assert.equal(W.starterFor("fresh-posts"), "");

// export
const md = W.toMarkdown({ title: " My post ", body: "Body text.\n", sources: "Site | https://s.example" });
assert.equal(md, "# My post\n\nBody text.\n\n## Sources\n- [Site](https://s.example)\n");
const txt = W.toPlainText({ title: "T", body: "## Head\n**bold** and `code`", sources: "Site | https://s.example" });
assert.equal(txt, "T\n\nHead\nbold and code\n\nSources\nSite: https://s.example\n");
assert.equal(W.exportFileName("Ünï: a/b?", "md"), "fresh-studio-Ünï-a-b.md");
assert.equal(W.exportFileName("", "txt"), "fresh-studio-draft.txt");
console.log("Fresh Studio writing contract passed (settings, counts, outline, sources, checks, export).");
