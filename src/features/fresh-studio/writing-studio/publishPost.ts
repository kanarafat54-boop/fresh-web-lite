/** Publishing a Studio text draft to Fresh Posts, with the dependencies passed in so it can be tested without a network. */
import { countWords, parseSources, toPlainText, type Draft } from "./writingDoc.ts";

/** Posts are short text: keep well under any database or feed limit. */
export const MAX_POST_CHARS = 5000;

export type PostText = { ok: true; text: string } | { ok: false; reason: string };

/** Title, plain text and sources, joined the way a post reads. Headings and emphasis marks are removed. */
export function postText(d: Draft): PostText {
  if (countWords(d.body) === 0) return { ok: false, reason: "Write some text first." };
  const { invalid } = parseSources(d.sources);
  if (invalid.length) return { ok: false, reason: "Fix the source lines that are not web addresses." };
  const text = toPlainText(d).trim();
  if (text.length > MAX_POST_CHARS) return { ok: false, reason: `A post can be up to ${MAX_POST_CHARS} characters. This one is ${text.length}.` };
  return { ok: true, text };
}

export type PublishDeps = {
  authorId: string | null;
  /** Creates the post. Rejects with an Error when it fails. */
  publish: (input: { authorId: string; content: string }) => Promise<{ id: string }>;
  /** Marks the Studio project published after the post exists. */
  markPublished: () => Promise<void>;
};
export type PublishOutcome =
  | { ok: true; postId: string; statusSaved: boolean }
  | { ok: false; reason: string };

export async function publishDraftAsPost(d: Draft, deps: PublishDeps): Promise<PublishOutcome> {
  if (!deps.authorId) return { ok: false, reason: "Sign in with Fresh ID to publish." };
  const built = postText(d);
  if (!built.ok) return built;
  let post: { id: string };
  try { post = await deps.publish({ authorId: deps.authorId, content: built.text }); }
  catch (error) { return { ok: false, reason: error instanceof Error ? error.message : "The post could not be published." }; }
  // The post is live. If only the project status fails to save, say so without hiding the success.
  let statusSaved = true;
  try { await deps.markPublished(); } catch { statusSaved = false; }
  return { ok: true, postId: post.id, statusSaved };
}
