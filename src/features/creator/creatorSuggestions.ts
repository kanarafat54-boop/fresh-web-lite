type Draft = { id: string; kind: "post" | "short"; content: string; media_url: string | null; status: string; created_at: string };

export type CreatorSuggestion = {
  id: string;
  title: string;
  reason: string;
  action: "post" | "short" | "drafts" | "refresh";
};

export function buildCreatorSuggestions(context: { postCount: number; shortCount: number; shortViews: number; followers: number; drafts: Draft[] }): CreatorSuggestion[] {
  const suggestions: CreatorSuggestion[] = [];
  if (context.postCount === 0) suggestions.push({ id: "first-post", title: "Publish your first professional post", reason: "Your Fresh Creator workspace has no published posts yet.", action: "post" });
  if (context.shortCount === 0) suggestions.push({ id: "first-short", title: "Create a Short", reason: "Short-form video is available and none is published yet.", action: "short" });
  if (context.drafts.length > 0) suggestions.push({ id: "finish-draft", title: "Finish a saved draft", reason: context.drafts.length + " draft" + (context.drafts.length === 1 ? " is" : "s are") + " waiting in your workspace.", action: "drafts" });
  if (context.shortCount > 0 && context.shortViews === 0) suggestions.push({ id: "short-discovery", title: "Review your Short publishing flow", reason: "Your stored Shorts have no recorded views yet; verify media, captions and publishing consistency before adding more.", action: "refresh" });
  if (context.followers > 0 && context.postCount + context.shortCount > 0) suggestions.push({ id: "audience", title: "Create something for your existing audience", reason: context.followers + " followers are already stored on your Fresh ID.", action: "post" });
  return suggestions.slice(0, 4);
}
