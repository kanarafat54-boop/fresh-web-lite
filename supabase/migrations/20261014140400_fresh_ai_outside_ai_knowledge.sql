-- Honest knowledge about outside AI and how Fresh AI answers. Idempotent.
with v(title, content) as (values
 ('Does Fresh AI use Gemini, ChatGPT, DeepSeek or other outside AI','No. Fresh AI uses no outside AI model: not Gemini, ChatGPT, OpenAI, Claude, DeepSeek or any other provider. An optional Gemini helper existed in an earlier version and has been removed, so no text you type is sent to an outside model. Fresh AI answers from its own kernel and knowledge. Web search for current facts is a search service, not an AI model.'),
 ('How Fresh AI gets its answers','Fresh AI gets answers in steps: it understands your goal, loads your private memory, retrieves matching Fresh knowledge and research evidence, checks the claims with truth states, and composes the answer. If it has no matching knowledge it says so honestly instead of guessing. What it knows grows as the owner adds knowledge and teaches it from feedback.')
)
insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
select null, 'fresh-web-lite-platform', v.title, v.content, 'text', 'docs/FRESH_AI_INDEPENDENCE_ROADMAP.md',
       '{"kind":"first-party","audit":"2026-10-15"}'::jsonb, 'KNOWN', 0.95, '{"dataset":"platform-knowledge-v1"}'::jsonb
from v
where not exists (select 1 from public.fresh_ai_knowledge k where k.project_id = 'fresh-web-lite-platform' and k.user_id is null and k.title = v.title);

update public.fresh_ai_knowledge
set content = 'The from-scratch model fresh-unified-1 is at pipeline smoke-test stage, trained on a tiny synthetic set, so its weights are not ready. Right now Fresh AI answers come from its own kernel: it understands your goal, retrieves from Fresh own knowledge and your private memory, checks claims, and composes the answer. No outside AI model is used.'
where project_id = 'fresh-web-lite-platform' and user_id is null and title = 'Fresh own model status';
