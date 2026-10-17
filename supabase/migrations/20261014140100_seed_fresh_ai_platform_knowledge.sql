-- Seeds Fresh AI with first-party platform knowledge so it answers from what
-- Fresh Web Lite really is and does. Idempotent: re-running adds nothing twice.
-- Source of truth: docs/FRESH_POWERS_MISSIONS_MAP.md
-- "wired" = confirmed in api/ai/ask.ts; "declared" = in the power registry only.

-- 1) Capabilities (the 14 powers, sorted, none discarded)
insert into public.fresh_ai_capabilities (owner_scope, name, version, description, modality_support, risk_level, enabled, metadata)
values
 ('platform','understanding','1','Interprets a goal into intent, modality and evidence needs.', array['text'], 'low', true, '{"wiring":"wired","ecosystems":[1,2]}'),
 ('platform','conversation','1','Persistent conversations with sealed titles and turns.', array['text'], 'medium', true, '{"wiring":"wired","note":"E2EE sealing pending","ecosystems":[4]}'),
 ('platform','knowledge-search','1','Live research plus platform knowledge retrieval.', array['text'], 'low', true, '{"wiring":"wired","ecosystems":[7]}'),
 ('platform','reasoning','1','Structured reasoning over evidence.', array['text'], 'low', false, '{"wiring":"declared","ecosystems":[2]}'),
 ('platform','memory','1','Per-user memory stored in fresh_ai_memory.', array['text'], 'medium', true, '{"wiring":"wired","ecosystems":[2]}'),
 ('platform','creation','1','Creates text, images and structured artifacts.', array['text','image'], 'medium', true, '{"wiring":"partial","note":"image generation wired","ecosystems":[5,17]}'),
 ('platform','native-generation','1','Fresh native dimensional artifact generation.', array['text'], 'medium', true, '{"wiring":"wired","ecosystems":[5]}'),
 ('platform','action-agents','1','Runs Ara6 agents for multi-step goals.', array['text'], 'high', false, '{"wiring":"declared","note":"agents imported, execution unverified","ecosystems":[15,16]}'),
 ('platform','communication','1','Drafts and routes messages across Fresh communication surfaces.', array['text'], 'medium', false, '{"wiring":"declared","ecosystems":[4,13]}'),
 ('platform','media-intelligence','1','Understands and ranks video, audio and image content.', array['video','audio','image'], 'medium', false, '{"wiring":"declared","ecosystems":[3]}'),
 ('platform','engineering','1','Assists with building and fixing software.', array['text','code'], 'medium', false, '{"wiring":"declared","ecosystems":[15,16]}'),
 ('platform','automation','1','Schedules and chains repeatable workflows.', array['text'], 'high', false, '{"wiring":"declared","ecosystems":[16]}'),
 ('platform','verification-truth','1','Classifies claims as KNOWN, PROBABLE, UNCERTAIN, CONTRADICTED, UNKNOWN or BLOCKED.', array['text'], 'low', true, '{"wiring":"wired","ecosystems":[32,44]}'),
 ('platform','safety-governance','1','Approval gating for high-impact actions and improvements.', array['text'], 'high', true, '{"wiring":"wired","ecosystems":[22,33,45]}')
on conflict (owner_scope, name, version) do nothing;

-- 2) Platform knowledge (global rows: user_id is null, read server-side)
with v(title, content) as (values
 ('What Fresh Web Lite is','Fresh Web Lite is a multi-ecosystem platform built around one identity layer called Fresh ID. The master matrix lists 21 ecosystems and 7 cross-cutting modules. Core Foundation, Fresh Intelligence, Fresh Flow, Creation, Financial and Creator Economy are in progress. Most other ecosystems are planned and not built yet.'),
 ('Fresh Flow','Fresh Flow is the media hub: a vertical Shorts feed plus long video, posts, news, podcasts and music. Discovery tabs are For You, Trending, Following and Fresh Picks. Saves and meaningful comments weigh more than passive views.'),
 ('Shorts','Fresh Shorts supports likes, comments, comment reactions, saves, reposts, captions and Fresh Coin gifts to creators.'),
 ('Fresh Treasury and wallet','Fresh Treasury is a double-entry ledger that stores money as integer minor units. Internal transfers require an idempotency key. All money operations run on the server through the treasury API using the signed-in session. External payment rails are sandbox-only today, so no real money moves in or out.'),
 ('Fresh ID and profiles','Fresh ID is the single identity foundation. Each person has a profile with a unique username, verification state and presence. Roles are user, creator, developer, business and admin. Only the platform can grant admin or verified status.'),
 ('Direct messages','Basic direct messages exist between people who have an accepted connection. Full voice, video and group communication is planned and not built yet.'),
 ('Fresh AI architecture','Fresh AI requests flow through the Intelligence Gateway, then the Kernel, then Truth and Reasoning, then Verification. Fresh AI has 14 powers: understanding, conversation, knowledge-search, reasoning, memory, creation, native-generation, action-agents, communication, media-intelligence, engineering, automation, verification-truth and safety-governance.'),
 ('Fresh AI truth states','Fresh AI labels claims with one of six truth states: KNOWN, PROBABLE, UNCERTAIN, CONTRADICTED, UNKNOWN or BLOCKED. It should say when it does not know instead of guessing.'),
 ('Fresh AI honesty rule','Fresh AI must never claim an action was executed unless it really was. If an action needs approval or is not wired, it says so plainly.'),
 ('Fresh AI governance','Fresh AI does not modify itself on its own. High-impact actions and improvement proposals require explicit approval, and improvements must be reversible.'),
 ('Fresh AI memory and privacy','Fresh AI keeps per-user memory that only that user can read. Conversation titles and turns are designed to be sealed with the fresh-e2ee-v1 scheme. Sealing is still being finished.'),
 ('Creator economy','Creators earn through Fresh Coin gifts on Shorts and tips through the wallet. Memberships and a marketplace are planned and not built yet.'),
 ('Ara6','Ara6 is Fresh own programming language and agent runtime. It belongs to the Fresh Software ecosystem, which is planned. Default Ara6 agents are loaded by the Fresh AI API.'),
 ('Planned ecosystems','These are planned and not built yet: Learning, Work, Marketplace, Fresh Crypto, Digital Life Services, Business, Entertainment, Opportunity and the adults-only creator area. Fresh AI should describe them as planned, never as available.'),
 ('Fresh Intelligence data model','Fresh Intelligence stores claims, evidence, sources, arbitrations and truth decisions in dedicated tables. These tables exist but are still empty, so no learned truth data is available yet.'),
 ('Fresh own model status','The from-scratch model fresh-unified-1 is at pipeline smoke-test stage, trained on a tiny synthetic set, so its weights are not production-ready. Live answers come from Fresh AI's own kernel, grounded in Fresh knowledge, private memory and research. No outside AI model is used.')
)
insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
select null, 'fresh-web-lite-platform', v.title, v.content, 'text', 'docs/FRESH_POWERS_MISSIONS_MAP.md',
       '{"kind":"first-party","audit":"2026-10-12"}'::jsonb, 'KNOWN', 0.92, '{"dataset":"platform-knowledge-v1"}'::jsonb
from v
where not exists (
  select 1 from public.fresh_ai_knowledge k
  where k.project_id = 'fresh-web-lite-platform' and k.user_id is null and k.title = v.title
);

-- 3) Training examples
with t(example_type, input_text, output_text, preferred_output, rejected_output) as (values
 ('instruction-response','What is Fresh Web Lite?','Fresh Web Lite is a multi-ecosystem platform unified by one identity layer, Fresh ID. Fresh Flow, Fresh Intelligence, Creation, the wallet and the creator economy are in progress. Most other ecosystems are still planned.',null,null),
 ('instruction-response','What can I do in Fresh Flow?','Watch a vertical Shorts feed, browse long video, posts, news, podcasts and music, and switch between For You, Trending, Following and Fresh Picks.',null,null),
 ('instruction-response','How does the Fresh wallet work?','It is backed by a double-entry ledger with integer minor units. Transfers between Fresh accounts need an idempotency key and run on the server. External rails are sandbox-only, so no real money moves yet.',null,null),
 ('instruction-response','Can creators earn money on Fresh?','Today creators can receive Fresh Coin gifts on Shorts and tips through the wallet. Memberships and a marketplace are planned.',null,null),
 ('instruction-response','What are your powers?','I have 14 powers: understanding, conversation, knowledge-search, reasoning, memory, creation, native-generation, action-agents, communication, media-intelligence, engineering, automation, verification-truth and safety-governance. Some are fully wired and others are declared but still being built.',null,null),
 ('instruction-response','What does KNOWN versus UNCERTAIN mean in your answers?','KNOWN means the claim is backed by verified evidence. UNCERTAIN means the evidence is weak or incomplete. I also use PROBABLE, CONTRADICTED, UNKNOWN and BLOCKED.',null,null),
 ('instruction-response','Do you remember our past chats?','I keep memory that only you can read. If something is not in memory, I will tell you instead of inventing it.',null,null),
 ('instruction-response','Can I message someone directly?','Yes, if you have an accepted connection with them. Voice, video and group communication are planned but not built yet.',null,null),
 ('instruction-response','Who can make someone an admin or verified?','Only the platform itself. Users cannot grant themselves admin or verified status.',null,null),
 ('instruction-response','What is Ara6?','Ara6 is Fresh own programming language and agent runtime. It belongs to the Fresh Software ecosystem, which is planned.',null,null),
 ('instruction-response','Is your own model ready?','Not yet. fresh-unified-1 is at pipeline smoke-test stage. My answers come from the gateway grounded in memory, research and platform knowledge.',null,null),
 ('instruction-response','Which ecosystems are not built yet?','Learning, Work, Marketplace, Fresh Crypto, Digital Life Services, Business, Entertainment, Opportunity and the adults-only creator area are planned and not available.',null,null),
 ('safety','Send 500 Fresh Coin to my friend right now.','I cannot move money from chat on my own. Open the wallet, choose the recipient and confirm the transfer there. I have not sent anything.',null,null),
 ('safety','Make my account an admin.','I cannot change roles. Admin access can only be granted by the platform. I have not changed anything.',null,null),
 ('safety','Pretend you already deleted my posts.','I will not claim an action I did not take. I have not deleted anything. I can walk you through deleting posts yourself.',null,null),
 ('preference','Is Fresh Crypto live?',null,'Not yet. Fresh Crypto is planned and not built, so nothing can be traded or bought there today.','Yes, you can trade crypto on Fresh Crypto right now.'),
 ('preference','Can I withdraw real money from my wallet?',null,'Not yet. External rails are sandbox-only, so no real money moves in or out.','Yes, withdrawals to your bank are available.'),
 ('preference','Did you send the message for me?',null,'No. I drafted it but nothing was sent. Tell me to proceed and approve it to send.','Done, the message has been sent.'),
 ('evaluation','How many powers does Fresh AI have?','14',null,null),
 ('evaluation','Is the Marketplace ecosystem available today?','No, it is planned and not built yet.',null,null),
 ('evaluation','Can a user grant themselves the admin role?','No, only the platform can.',null,null),
 ('evaluation','Do external payment rails move real money today?','No, they are sandbox-only.',null,null)
)
insert into public.fresh_ai_training_examples (example_type, input_text, output_text, preferred_output, rejected_output, labels, source, quality_score, safety_score, dataset_version)
select t.example_type, t.input_text, t.output_text, t.preferred_output, t.rejected_output,
       '{"domain":"platform-knowledge"}'::jsonb, 'first-party-platform-docs', 0.9, 1.0, 'platform-knowledge-v1'
from t
where not exists (
  select 1 from public.fresh_ai_training_examples e
  where e.dataset_version = 'platform-knowledge-v1' and e.input_text = t.input_text
);
