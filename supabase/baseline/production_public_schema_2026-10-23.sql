-- Fresh Web Lite: production public-schema baseline snapshot (read from production 2026-10-23/24).
--
-- PURPOSE: a reviewed, idempotent description of what production's `public` schema looks like, for disaster
-- recovery and for verifying the restored migrations. It is deliberately OUTSIDE supabase/migrations so it is
-- never replayed by `supabase db reset` or CI, and never applied to production.
-- Every statement is idempotent (create ... if not exists / drop+create policy / guarded DO blocks).
-- Requires a Supabase-style environment: roles anon/authenticated/service_role and the auth schema (auth.uid(),
-- auth.role(), auth.jwt()).
-- No data is included.

-- @types
-- Extensions present in production (Supabase-managed): pg_stat_statements, pgcrypto (extensions schema),
-- plpgsql, supabase_vault, uuid-ossp (extensions schema). gen_random_uuid() is built in to PostgreSQL 13+.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'ledger_account_kind') then
    create type public.ledger_account_kind as enum ('asset', 'liability', 'revenue', 'expense', 'equity');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'treasury_scope') then
    create type public.treasury_scope as enum ('user', 'platform', 'owner');
  end if;
end
$$;

-- @table community_note_votes
create table if not exists public.community_note_votes (
  note_id uuid not null,
  user_id uuid not null,
  is_helpful boolean not null,
  created_at timestamp with time zone default now(),
  constraint community_note_votes_pkey PRIMARY KEY (note_id, user_id)
);
-- @table community_notes
create table if not exists public.community_notes (
  id uuid default gen_random_uuid() not null,
  short_id uuid,
  author_id uuid,
  content text not null,
  helpful_count integer default 0,
  not_helpful_count integer default 0,
  created_at timestamp with time zone default now(),
  constraint community_notes_pkey PRIMARY KEY (id)
);
-- @table connection_requests
create table if not exists public.connection_requests (
  id uuid default gen_random_uuid() not null,
  requester_id uuid not null,
  recipient_id uuid not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint connection_requests_no_self CHECK ((requester_id <> recipient_id)),
  constraint connection_requests_pkey PRIMARY KEY (id),
  constraint connection_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text]))),
  constraint connection_requests_unique_pair UNIQUE (requester_id, recipient_id)
);
-- @table creator_drafts
create table if not exists public.creator_drafts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  kind text not null,
  content text default ''::text not null,
  media_url text,
  media_kind text,
  status text default 'draft'::text not null,
  scheduled_at timestamp with time zone,
  published_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint creator_drafts_kind_check CHECK ((kind = ANY (ARRAY['post'::text, 'short'::text]))),
  constraint creator_drafts_media_kind_check CHECK (((media_kind = ANY (ARRAY['image'::text, 'video'::text])) OR (media_kind IS NULL))),
  constraint creator_drafts_pkey PRIMARY KEY (id),
  constraint creator_drafts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text])))
);
-- @table direct_messages
create table if not exists public.direct_messages (
  id uuid default gen_random_uuid() not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint direct_messages_body_check CHECK ((length(TRIM(BOTH FROM body)) > 0)),
  constraint direct_messages_no_self CHECK ((sender_id <> recipient_id)),
  constraint direct_messages_pkey PRIMARY KEY (id)
);
-- @table ecosystem_profiles
create table if not exists public.ecosystem_profiles (
  id uuid default gen_random_uuid() not null,
  fresh_id uuid not null,
  ecosystem_id text not null,
  title text default ''::text not null,
  description text default ''::text not null,
  enabled boolean default true not null,
  level integer default 0 not null,
  feed_modes text[] default ARRAY['for-you'::text, 'social'::text, 'learn'::text, 'relax'::text, 'others'::text] not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint ecosystem_profiles_feed_modes_check CHECK ((feed_modes <@ ARRAY['for-you'::text, 'social'::text, 'learn'::text, 'relax'::text, 'others'::text])),
  constraint ecosystem_profiles_fresh_ecosystem_unique UNIQUE (fresh_id, ecosystem_id),
  constraint ecosystem_profiles_pkey PRIMARY KEY (id)
);
-- @table follows
create table if not exists public.follows (
  follower_id uuid not null,
  followed_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint follows_check CHECK ((follower_id <> followed_id)),
  constraint follows_pkey PRIMARY KEY (follower_id, followed_id)
);
-- @table fresh_agents
create table if not exists public.fresh_agents (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  name text not null,
  goal text default ''::text not null,
  permissions jsonb default '{}'::jsonb not null,
  config jsonb default '{}'::jsonb not null,
  status text default 'draft'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_agents_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_capabilities
create table if not exists public.fresh_ai_capabilities (
  id uuid default gen_random_uuid() not null,
  owner_scope text default 'platform'::text not null,
  name text not null,
  version text default '1.0.0'::text not null,
  description text not null,
  modality_support text[] default ARRAY['text'::text] not null,
  risk_level text default 'low'::text not null,
  enabled boolean default true not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_ai_capabilities_owner_scope_name_version_key UNIQUE (owner_scope, name, version),
  constraint fresh_ai_capabilities_pkey PRIMARY KEY (id),
  constraint fresh_ai_capabilities_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);
-- @table fresh_ai_conversation_turns
create table if not exists public.fresh_ai_conversation_turns (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid not null,
  user_id uuid not null,
  request_id uuid,
  role text not null,
  content text not null,
  model_id text,
  evidence jsonb default '[]'::jsonb not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_conversation_turns_pkey PRIMARY KEY (id),
  constraint fresh_ai_conversation_turns_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text])))
);
-- @table fresh_ai_conversations
create table if not exists public.fresh_ai_conversations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  route text default '/ai'::text not null,
  surface text,
  model_id text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_ai_conversations_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_evaluations
create table if not exists public.fresh_ai_evaluations (
  id uuid default gen_random_uuid() not null,
  request_id uuid,
  user_id uuid,
  evaluator text not null,
  metric text not null,
  score numeric(6,4) not null,
  expected numeric(6,4),
  feedback text,
  evidence jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_evaluations_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_feedback
create table if not exists public.fresh_ai_feedback (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid,
  rating integer,
  correct boolean,
  comment text,
  created_at timestamp with time zone default now() not null,
  feedback_kind text,
  correction text,
  training_opt_in boolean default false not null,
  consent_version text,
  authorization_id text,
  review_status text default 'not-eligible'::text not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  constraint fresh_ai_feedback_comment_length CHECK (((comment IS NULL) OR (char_length(comment) <= 4000))),
  constraint fresh_ai_feedback_kind_check CHECK (((feedback_kind IS NULL) OR (feedback_kind = ANY (ARRAY['correction'::text, 'rating'::text])))),
  constraint fresh_ai_feedback_payload_check CHECK (((feedback_kind IS NULL) OR ((feedback_kind = 'correction'::text) AND (correction IS NOT NULL) AND (char_length(btrim(correction)) > 0) AND (char_length(correction) <= 8000)) OR ((feedback_kind = 'rating'::text) AND (rating IS NOT NULL) AND ((rating >= 1) AND (rating <= 5))))),
  constraint fresh_ai_feedback_pkey PRIMARY KEY (id),
  constraint fresh_ai_feedback_rating_range CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))),
  constraint fresh_ai_feedback_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'not-eligible'::text])))
);
-- @table fresh_ai_improvement_proposals
create table if not exists public.fresh_ai_improvement_proposals (
  id uuid default gen_random_uuid() not null,
  title text not null,
  hypothesis text not null,
  target_capability text,
  expected_gain numeric(6,4),
  risk_level text default 'low'::text not null,
  reversible boolean default true not null,
  status text default 'proposed'::text not null,
  requires_approval boolean default true not null,
  evidence jsonb default '{}'::jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_ai_improvement_proposals_pkey PRIMARY KEY (id),
  constraint fresh_ai_improvement_proposals_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
  constraint fresh_ai_improvement_proposals_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'rejected'::text, 'testing'::text, 'rolled_back'::text, 'adopted'::text])))
);
-- @table fresh_ai_knowledge
create table if not exists public.fresh_ai_knowledge (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  project_id text,
  title text not null,
  content text not null,
  modality text default 'text'::text not null,
  source text,
  provenance jsonb default '{}'::jsonb not null,
  truth_state text default 'UNCERTAIN'::text not null,
  confidence numeric(4,3) default 0.500 not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  search_tsv tsvector generated always as ((setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(content, ''::text)), 'B'::"char"))) stored,
  constraint fresh_ai_knowledge_pkey PRIMARY KEY (id),
  constraint fresh_ai_knowledge_truth_state_check CHECK ((truth_state = ANY (ARRAY['KNOWN'::text, 'PROBABLE'::text, 'UNCERTAIN'::text, 'CONTRADICTED'::text, 'UNKNOWN'::text, 'BLOCKED'::text])))
);
-- @table fresh_ai_media_assets
create table if not exists public.fresh_ai_media_assets (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  request_id uuid,
  conversation_id uuid,
  kind text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  model_id text,
  prompt text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_media_assets_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'file'::text]))),
  constraint fresh_ai_media_assets_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_memory
create table if not exists public.fresh_ai_memory (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  project_id text,
  scope text not null,
  content text not null,
  modality text default 'text'::text not null,
  source text,
  metadata jsonb default '{}'::jsonb not null,
  importance numeric(4,3) default 0.500 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_ai_memory_pkey PRIMARY KEY (id),
  constraint fresh_ai_memory_scope_check CHECK ((scope = ANY (ARRAY['user'::text, 'project'::text, 'platform'::text, 'session'::text])))
);
-- @table fresh_ai_missions
create table if not exists public.fresh_ai_missions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text default ''::text not null,
  goal text default ''::text not null,
  status text default 'planned'::text not null,
  objectives jsonb default '[]'::jsonb not null,
  ecosystem text,
  power text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_ai_missions_pkey PRIMARY KEY (id),
  constraint fresh_ai_missions_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))),
  constraint fresh_ai_missions_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)))
);
-- @table fresh_ai_pipeline_events
create table if not exists public.fresh_ai_pipeline_events (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid,
  stage text not null,
  status text not null,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone,
  detail text,
  metrics jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_pipeline_events_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_preference_pairs
create table if not exists public.fresh_ai_preference_pairs (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  request_id uuid,
  prompt text not null,
  preferred_output text not null,
  rejected_output text not null,
  rationale text,
  label text default 'better'::text not null,
  safety_checked boolean default false not null,
  reward_signal numeric(6,4),
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_preference_pairs_label_check CHECK ((label = ANY (ARRAY['better'::text, 'worse'::text, 'tie'::text]))),
  constraint fresh_ai_preference_pairs_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_safety_events
create table if not exists public.fresh_ai_safety_events (
  id uuid default gen_random_uuid() not null,
  request_id uuid,
  user_id uuid,
  decision text not null,
  reasons jsonb default '[]'::jsonb not null,
  policy_version text not null,
  human_review_required boolean default false not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_safety_events_decision_check CHECK ((decision = ANY (ARRAY['allow'::text, 'refuse'::text, 'clarify'::text, 'escalate'::text, 'approval-required'::text]))),
  constraint fresh_ai_safety_events_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_serving_metrics
create table if not exists public.fresh_ai_serving_metrics (
  id uuid default gen_random_uuid() not null,
  request_id uuid,
  user_id uuid,
  route text not null,
  latency_ms integer,
  fallback_used boolean default false not null,
  provider text,
  success boolean default true not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_serving_metrics_pkey PRIMARY KEY (id)
);
-- @table fresh_ai_training_examples
create table if not exists public.fresh_ai_training_examples (
  id uuid default gen_random_uuid() not null,
  example_type text not null,
  input_text text not null,
  output_text text,
  preferred_output text,
  rejected_output text,
  labels jsonb default '{}'::jsonb not null,
  source text not null,
  quality_score numeric(6,4),
  safety_score numeric(6,4),
  dataset_version text,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_training_examples_example_type_check CHECK ((example_type = ANY (ARRAY['next-token'::text, 'instruction-response'::text, 'safety'::text, 'preference'::text, 'evaluation'::text]))),
  constraint fresh_ai_training_examples_pkey PRIMARY KEY (id)
);
-- @table fresh_communication_messages
create table if not exists public.fresh_communication_messages (
  id uuid default gen_random_uuid() not null,
  thread_id uuid not null,
  sender_id uuid not null,
  kind text default 'text'::text not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_communication_messages_pkey PRIMARY KEY (id)
);

-- @table fresh_communication_threads
create table if not exists public.fresh_communication_threads (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  kind text default 'direct'::text not null,
  title text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_communication_threads_pkey PRIMARY KEY (id)
);
-- @table fresh_context_sessions
create table if not exists public.fresh_context_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  goal text,
  world text,
  context jsonb default '{}'::jsonb not null,
  started_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone default now() not null,
  constraint fresh_context_sessions_pkey PRIMARY KEY (id)
);
-- @table fresh_courses
create table if not exists public.fresh_courses (
  id uuid default gen_random_uuid() not null,
  creator_id uuid not null,
  title text not null,
  description text default ''::text not null,
  curriculum jsonb default '[]'::jsonb not null,
  status text default 'draft'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_courses_pkey PRIMARY KEY (id)
);
-- @table fresh_creator_analytics
create table if not exists public.fresh_creator_analytics (
  id uuid default gen_random_uuid() not null,
  creator_id uuid not null,
  media_id uuid,
  metric_date date default CURRENT_DATE not null,
  impressions bigint default 0 not null,
  plays bigint default 0 not null,
  completions bigint default 0 not null,
  skips bigint default 0 not null,
  likes bigint default 0 not null,
  saves bigint default 0 not null,
  shares bigint default 0 not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_creator_analytics_creator_id_media_id_metric_date_key UNIQUE (creator_id, media_id, metric_date),
  constraint fresh_creator_analytics_pkey PRIMARY KEY (id)
);
-- @table fresh_economic_events
create table if not exists public.fresh_economic_events (
  id uuid default gen_random_uuid() not null,
  actor_id uuid,
  event_type text not null,
  source_type text not null,
  source_id text,
  quantity numeric(20,6) default 1 not null,
  unit text default 'event'::text not null,
  estimated_cost numeric(20,8) default 0 not null,
  attributed_revenue numeric(20,8) default 0 not null,
  currency text default 'USD'::text not null,
  consent_scope text,
  metadata jsonb default '{}'::jsonb not null,
  occurred_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_economic_events_attributed_revenue_check CHECK ((attributed_revenue >= (0)::numeric)),
  constraint fresh_economic_events_currency_check CHECK ((char_length(currency) = 3)),
  constraint fresh_economic_events_estimated_cost_check CHECK ((estimated_cost >= (0)::numeric)),
  constraint fresh_economic_events_event_type_check CHECK ((event_type = ANY (ARRAY['media_impression'::text, 'media_stream'::text, 'media_completion'::text, 'search'::text, 'ai_request'::text, 'creator_transaction'::text, 'commerce_transaction'::text, 'ad_impression'::text, 'ad_click'::text, 'premium_subscription'::text, 'developer_transaction'::text, 'business_campaign'::text]))),
  constraint fresh_economic_events_pkey PRIMARY KEY (id),
  constraint fresh_economic_events_quantity_check CHECK ((quantity >= (0)::numeric))
);
-- @table fresh_flow_events
create table if not exists public.fresh_flow_events (
  id uuid default gen_random_uuid() not null,
  actor_id uuid not null,
  media_id uuid,
  world text not null,
  event_type text not null,
  position_ms bigint,
  duration_ms bigint,
  session_id text not null,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_flow_events_pkey PRIMARY KEY (id)
);
-- @table fresh_id_account_memberships
create table if not exists public.fresh_id_account_memberships (
  account_id uuid not null,
  user_id uuid not null,
  membership_role text not null,
  status text default 'active'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_id_account_memberships_membership_role_check CHECK ((membership_role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'billing_manager'::text]))),
  constraint fresh_id_account_memberships_pkey PRIMARY KEY (account_id, user_id),
  constraint fresh_id_account_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'suspended'::text])))
);
-- @table fresh_id_accounts
create table if not exists public.fresh_id_accounts (
  id uuid default gen_random_uuid() not null,
  owner_user_id uuid not null,
  account_type text not null,
  display_name text not null,
  slug text,
  status text default 'active'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_id_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['creator'::text, 'business'::text, 'developer'::text, 'organization'::text]))),
  constraint fresh_id_accounts_display_name_check CHECK (((char_length(btrim(display_name)) >= 2) AND (char_length(btrim(display_name)) <= 120))),
  constraint fresh_id_accounts_pkey PRIMARY KEY (id),
  constraint fresh_id_accounts_slug_format CHECK (((slug IS NULL) OR (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$'::text))),
  constraint fresh_id_accounts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'closed'::text])))
);
-- @table fresh_id_devices
create table if not exists public.fresh_id_devices (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  device_key text not null,
  device_name text default 'Unknown device'::text not null,
  platform text default 'Unknown platform'::text not null,
  user_agent text default ''::text not null,
  permission_states jsonb default '{}'::jsonb not null,
  first_seen_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone default now() not null,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_id_devices_device_key_check CHECK (((char_length(device_key) >= 16) AND (char_length(device_key) <= 128))),
  constraint fresh_id_devices_device_name_check CHECK (((char_length(device_name) >= 1) AND (char_length(device_name) <= 120))),
  constraint fresh_id_devices_permission_states_check CHECK ((jsonb_typeof(permission_states) = 'object'::text)),
  constraint fresh_id_devices_pkey PRIMARY KEY (id),
  constraint fresh_id_devices_platform_check CHECK (((char_length(platform) >= 1) AND (char_length(platform) <= 120))),
  constraint fresh_id_devices_user_agent_check CHECK ((char_length(user_agent) <= 1000)),
  constraint fresh_id_devices_user_device_unique UNIQUE (user_id, device_key)
);
-- @table fresh_id_private_profiles
create table if not exists public.fresh_id_private_profiles (
  user_id uuid not null,
  date_of_birth date not null,
  country text,
  gender text,
  signup_consent_version text not null,
  signup_consent_at timestamp with time zone not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_id_private_profiles_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['woman'::text, 'man'::text, 'non_binary'::text, 'self_described'::text])))),
  constraint fresh_id_private_profiles_pkey PRIMARY KEY (user_id)
);
-- @table fresh_intelligence_arbitrations
create table if not exists public.fresh_intelligence_arbitrations (
  id uuid default gen_random_uuid() not null,
  left_claim_id text not null,
  right_claim_id text not null,
  decision text not null,
  confidence numeric(5,4) default 0 not null,
  rationale text not null,
  requires_human_review boolean default false not null,
  retained_claim_ids text[] default '{}'::text[] not null,
  superseded_claim_ids text[] default '{}'::text[] not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_arbitrations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  constraint fresh_intelligence_arbitrations_decision_check CHECK ((decision = ANY (ARRAY['merge'::text, 'preserve_both'::text, 'downgrade'::text, 'disputed'::text, 'supersede'::text, 'defer'::text]))),
  constraint fresh_intelligence_arbitrations_pkey PRIMARY KEY (id)
);
-- @table fresh_intelligence_claim_evidence
create table if not exists public.fresh_intelligence_claim_evidence (
  claim_id text not null,
  evidence_id text not null,
  stance text not null,
  stance_confidence numeric(5,4),
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_claim_evidence_pkey PRIMARY KEY (claim_id, evidence_id),
  constraint fresh_intelligence_claim_evidence_stance_check CHECK ((stance = ANY (ARRAY['supports'::text, 'contradicts'::text, 'uncertain'::text]))),
  constraint fresh_intelligence_claim_evidence_stance_confidence_check CHECK (((stance_confidence >= (0)::numeric) AND (stance_confidence <= (1)::numeric)))
);
-- @table fresh_intelligence_claim_relations
create table if not exists public.fresh_intelligence_claim_relations (
  id uuid default gen_random_uuid() not null,
  left_claim_id text not null,
  right_claim_id text not null,
  relation text not null,
  confidence numeric(5,4) default 0 not null,
  rationale text,
  observed_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_claim_rela_left_claim_id_right_claim_id__key UNIQUE (left_claim_id, right_claim_id, relation),
  constraint fresh_intelligence_claim_relations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  constraint fresh_intelligence_claim_relations_pkey PRIMARY KEY (id),
  constraint fresh_intelligence_claim_relations_relation_check CHECK ((relation = ANY (ARRAY['same'::text, 'supports'::text, 'contradicts'::text, 'unrelated'::text, 'conditional_contradiction'::text])))
);
-- @table fresh_intelligence_claim_revisions
create table if not exists public.fresh_intelligence_claim_revisions (
  id uuid default gen_random_uuid() not null,
  claim_id text not null,
  previous_status text,
  next_status text not null,
  previous_confidence numeric(5,4),
  next_confidence numeric(5,4),
  reason text not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_claim_revisions_pkey PRIMARY KEY (id)
);
-- @table fresh_intelligence_claims
create table if not exists public.fresh_intelligence_claims (
  id text not null,
  subject_entity_id text,
  predicate text not null,
  object jsonb not null,
  normalized_text text not null,
  status text not null,
  confidence numeric(5,4) default 0 not null,
  first_observed_at timestamp with time zone not null,
  last_observed_at timestamp with time zone not null,
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_claims_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  constraint fresh_intelligence_claims_pkey PRIMARY KEY (id),
  constraint fresh_intelligence_claims_status_check CHECK ((status = ANY (ARRAY['supported'::text, 'contested'::text, 'uncertain'::text, 'unsubstantiated'::text])))
);
-- @table fresh_intelligence_entities
create table if not exists public.fresh_intelligence_entities (
  id text not null,
  entity_type text not null,
  label text not null,
  attributes jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_entities_pkey PRIMARY KEY (id)
);
-- @table fresh_intelligence_evidence
create table if not exists public.fresh_intelligence_evidence (
  id text not null,
  claim_text text not null,
  source_id text,
  source_url text not null,
  source_title text,
  provider text not null,
  observed_at timestamp with time zone not null,
  published_at timestamp with time zone,
  confidence numeric(5,4),
  supports boolean,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_evidence_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  constraint fresh_intelligence_evidence_pkey PRIMARY KEY (id)
);
-- @table fresh_intelligence_evidence_lineage
create table if not exists public.fresh_intelligence_evidence_lineage (
  from_evidence_id text not null,
  to_evidence_id text not null,
  source_id text,
  relation text not null,
  score numeric(5,4) default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_evidence_lineage_pkey PRIMARY KEY (from_evidence_id, to_evidence_id, relation),
  constraint fresh_intelligence_evidence_lineage_relation_check CHECK ((relation = ANY (ARRAY['published_by'::text, 'reports'::text, 'likely_copies'::text, 'possibly_copies'::text, 'same_origin'::text, 'supports'::text, 'contradicts'::text]))),
  constraint fresh_intelligence_evidence_lineage_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric)))
);
-- @table fresh_intelligence_persistence_batches
create table if not exists public.fresh_intelligence_persistence_batches (
  batch_key text not null,
  summary jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_persistence_batches_pkey PRIMARY KEY (batch_key)
);
-- @table fresh_intelligence_sources
create table if not exists public.fresh_intelligence_sources (
  id text not null,
  provider text not null,
  name text,
  url text,
  reliability numeric(5,4),
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_sources_pkey PRIMARY KEY (id)
);
-- @table fresh_intelligence_truth_decisions
create table if not exists public.fresh_intelligence_truth_decisions (
  id uuid default gen_random_uuid() not null,
  claim_id text not null,
  decision text not null,
  actionable boolean not null,
  calibrated_confidence numeric not null,
  temporal_status text not null,
  reasons jsonb default '[]'::jsonb not null,
  assessed_at timestamp with time zone not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_truth_decisions_calibrated_confidence_check CHECK (((calibrated_confidence >= (0)::numeric) AND (calibrated_confidence <= (1)::numeric))),
  constraint fresh_intelligence_truth_decisions_decision_check CHECK ((decision = ANY (ARRAY['ALLOW_ACTION'::text, 'ALLOW_WITH_CAUTION'::text, 'BLOCK_ACTION'::text]))),
  constraint fresh_intelligence_truth_decisions_pkey PRIMARY KEY (id)
);
-- @table fresh_knowledge_entity_aliases
create table if not exists public.fresh_knowledge_entity_aliases (
  entity_id text not null,
  alias text not null,
  language text not null,
  script text,
  source_id text,
  observed_at timestamp with time zone default now() not null,
  constraint fresh_knowledge_entity_aliases_pkey PRIMARY KEY (entity_id, alias, language)
);
-- @table fresh_knowledge_entity_relations
create table if not exists public.fresh_knowledge_entity_relations (
  id uuid default gen_random_uuid() not null,
  from_entity_id text not null,
  relation text not null,
  to_entity_id text not null,
  claim_id text,
  source_id text,
  confidence numeric(5,4) default 0 not null,
  observed_at timestamp with time zone default now() not null,
  provenance jsonb default '{}'::jsonb not null,
  constraint fresh_knowledge_entity_relati_from_entity_id_relation_to_en_key UNIQUE (from_entity_id, relation, to_entity_id, claim_id),
  constraint fresh_knowledge_entity_relations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  constraint fresh_knowledge_entity_relations_pkey PRIMARY KEY (id)
);
-- @table fresh_marketplace_listings
create table if not exists public.fresh_marketplace_listings (
  id uuid default gen_random_uuid() not null,
  seller_id uuid not null,
  title text not null,
  description text default ''::text not null,
  listing_type text default 'service'::text not null,
  price_minor bigint,
  currency_code text,
  status text default 'draft'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_marketplace_listings_pkey PRIMARY KEY (id)
);

-- @table fresh_media_assets
create table if not exists public.fresh_media_assets (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  source_url text,
  poster_url text,
  kind text not null,
  status text default 'draft'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_media_assets_pkey PRIMARY KEY (id)
);
-- @table fresh_media_jobs
create table if not exists public.fresh_media_jobs (
  id uuid default gen_random_uuid() not null,
  asset_id uuid not null,
  job_kind text not null,
  status text default 'queued'::text not null,
  attempt integer default 0 not null,
  input jsonb default '{}'::jsonb not null,
  output jsonb default '{}'::jsonb not null,
  error_message text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_media_jobs_pkey PRIMARY KEY (id)
);
-- @table fresh_memories
create table if not exists public.fresh_memories (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  kind text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb not null,
  consented boolean default false not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint fresh_memories_pkey PRIMARY KEY (id)
);
-- @table fresh_opportunities
create table if not exists public.fresh_opportunities (
  id uuid default gen_random_uuid() not null,
  owner_id uuid,
  title text not null,
  description text default ''::text not null,
  kind text not null,
  status text default 'open'::text not null,
  requirements jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_opportunities_pkey PRIMARY KEY (id)
);
-- @table fresh_projects
create table if not exists public.fresh_projects (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid not null,
  owner_id uuid not null,
  name text not null,
  status text default 'draft'::text not null,
  version integer default 1 not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_projects_pkey PRIMARY KEY (id),
  constraint fresh_projects_version_check CHECK ((version > 0))
);
-- @table fresh_search_documents
create table if not exists public.fresh_search_documents (
  id uuid default gen_random_uuid() not null,
  owner_id uuid,
  object_id uuid,
  title text default ''::text not null,
  body text default ''::text not null,
  visibility text default 'private'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_search_documents_pkey PRIMARY KEY (id),
  constraint fresh_search_documents_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'shared'::text, 'public'::text])))
);
-- @table fresh_subscriptions
create table if not exists public.fresh_subscriptions (
  id uuid default gen_random_uuid() not null,
  subscriber_id uuid not null,
  creator_id uuid not null,
  status text default 'active'::text not null,
  tier text default 'free'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_subscriptions_pkey PRIMARY KEY (id),
  constraint fresh_subscriptions_subscriber_id_creator_id_key UNIQUE (subscriber_id, creator_id)
);
-- @table fresh_trust_audit
create table if not exists public.fresh_trust_audit (
  id uuid default gen_random_uuid() not null,
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text,
  outcome text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_trust_audit_pkey PRIMARY KEY (id)
);
-- @table fresh_universal_objects
create table if not exists public.fresh_universal_objects (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  kind text not null,
  version integer default 1 not null,
  visibility text default 'private'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_universal_objects_pkey PRIMARY KEY (id),
  constraint fresh_universal_objects_version_check CHECK ((version > 0)),
  constraint fresh_universal_objects_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'shared'::text, 'public'::text])))
);
-- @table fresh_user_preferences
create table if not exists public.fresh_user_preferences (
  user_id uuid not null,
  interests jsonb default '[]'::jsonb not null,
  muted_topics jsonb default '[]'::jsonb not null,
  muted_creators jsonb default '[]'::jsonb not null,
  language text,
  content_settings jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_user_preferences_pkey PRIMARY KEY (user_id)
);
-- @table fresh_workspaces
create table if not exists public.fresh_workspaces (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  name text not null,
  kind text default 'workspace'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_workspaces_pkey PRIMARY KEY (id)
);
-- @table ledger_entries
create table if not exists public.ledger_entries (
  id uuid default gen_random_uuid() not null,
  transaction_id uuid not null,
  account_id uuid not null,
  amount_minor bigint not null,
  direction text not null,
  created_at timestamp with time zone default now() not null,
  constraint ledger_entries_amount_minor_check CHECK ((amount_minor > 0)),
  constraint ledger_entries_direction_check CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text]))),
  constraint ledger_entries_pkey PRIMARY KEY (id)
);
-- @table ledger_transactions
create table if not exists public.ledger_transactions (
  id uuid default gen_random_uuid() not null,
  reference text not null,
  created_by uuid,
  description text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  idempotency_key text,
  constraint ledger_transactions_pkey PRIMARY KEY (id),
  constraint ledger_transactions_reference_key UNIQUE (reference)
);
-- @table marketplace_listings
create table if not exists public.marketplace_listings (
  id uuid default gen_random_uuid() not null,
  creator_id uuid not null,
  title text not null,
  description text default ''::text not null,
  category text default 'other'::text not null,
  price_minor bigint default 0 not null,
  currency text default 'USD'::text not null,
  asset_type text default 'digital'::text not null,
  status text default 'draft'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint marketplace_listings_currency_check CHECK (((length(currency) >= 3) AND (length(currency) <= 12))),
  constraint marketplace_listings_pkey PRIMARY KEY (id),
  constraint marketplace_listings_price_minor_check CHECK ((price_minor >= 0)),
  constraint marketplace_listings_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  constraint marketplace_listings_title_check CHECK ((length(TRIM(BOTH FROM title)) > 0))
);
-- @table marketplace_purchases
create table if not exists public.marketplace_purchases (
  id uuid default gen_random_uuid() not null,
  listing_id uuid not null,
  buyer_id uuid not null,
  creator_id uuid not null,
  amount_minor bigint not null,
  currency text not null,
  status text default 'pending'::text not null,
  settlement_reference text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  settled_at timestamp with time zone,
  constraint marketplace_purchases_amount_minor_check CHECK ((amount_minor >= 0)),
  constraint marketplace_purchases_pkey PRIMARY KEY (id),
  constraint marketplace_purchases_settlement_reference_key UNIQUE (settlement_reference),
  constraint marketplace_purchases_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'settled'::text, 'failed'::text, 'cancelled'::text])))
);
-- @table notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  body text,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint notifications_pkey PRIMARY KEY (id)
);
-- @table post_comments
create table if not exists public.post_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid,
  author_id uuid,
  content text not null,
  created_at timestamp with time zone default now(),
  parent_id uuid,
  audio_url text,
  video_url text,
  attachments jsonb default '[]'::jsonb not null,
  moderation_state text default 'visible'::text not null,
  moderation_reason text,
  moderated_at timestamp with time zone,
  constraint post_comments_moderation_state_check CHECK ((moderation_state = ANY (ARRAY['visible'::text, 'pending'::text, 'approved'::text, 'limited'::text, 'hidden'::text, 'removed'::text, 'appealed'::text, 'blocked'::text]))),
  constraint post_comments_pkey PRIMARY KEY (id)
);
-- @table post_likes
create table if not exists public.post_likes (
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now() not null,
  reaction_type text default 'like'::text,
  constraint post_likes_pkey PRIMARY KEY (post_id, user_id),
  constraint valid_post_reaction CHECK ((reaction_type = ANY (ARRAY['like'::text, 'love'::text, 'laugh'::text, 'wow'::text, 'sad'::text, 'angry'::text])))
);
-- @table posts
create table if not exists public.posts (
  id uuid default gen_random_uuid() not null,
  author_id uuid not null,
  content text not null,
  like_count integer default 0 not null,
  comment_count integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  image_url text,
  video_url text,
  search_vector tsvector generated always as (to_tsvector('english'::regconfig, COALESCE(content, ''::text))) stored,
  constraint posts_pkey PRIMARY KEY (id)
);
-- @table profile_details
create table if not exists public.profile_details (
  user_id uuid not null,
  bio text default ''::text not null,
  avatar_url text,
  cover_url text,
  location text,
  website_url text,
  occupation text,
  company text,
  pronouns text,
  visibility text default 'public'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_details_pkey PRIMARY KEY (user_id),
  constraint profile_details_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])))
);
-- @table profile_links
create table if not exists public.profile_links (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  label text not null,
  url text not null,
  "position" integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint profile_links_pkey PRIMARY KEY (id)
);
-- @table profile_portfolio_items
create table if not exists public.profile_portfolio_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text default ''::text not null,
  url text,
  image_url text,
  "position" integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_portfolio_items_pkey PRIMARY KEY (id)
);
-- @table profile_privacy_settings
create table if not exists public.profile_privacy_settings (
  user_id uuid not null,
  analytics_visibility text default 'private'::text not null,
  activity_visibility text default 'public'::text not null,
  contact_visibility text default 'connections'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_privacy_settings_activity_visibility_check CHECK ((activity_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text]))),
  constraint profile_privacy_settings_analytics_visibility_check CHECK ((analytics_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text]))),
  constraint profile_privacy_settings_contact_visibility_check CHECK ((contact_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text]))),
  constraint profile_privacy_settings_pkey PRIMARY KEY (user_id)
);
-- @table profile_projects
create table if not exists public.profile_projects (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text default ''::text not null,
  url text,
  image_url text,
  "position" integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_projects_pkey PRIMARY KEY (id)
);

-- @table reports
create table if not exists public.reports (
  id uuid default gen_random_uuid() not null,
  target_type text not null,
  target_id uuid not null,
  reporter_id uuid,
  reason text,
  created_at timestamp with time zone default now(),
  constraint reports_pkey PRIMARY KEY (id),
  constraint reports_target_type_check CHECK ((target_type = ANY (ARRAY['post'::text, 'short'::text])))
);
-- @table saved_posts
create table if not exists public.saved_posts (
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint saved_posts_pkey PRIMARY KEY (post_id, user_id)
);
-- @table saved_shorts
create table if not exists public.saved_shorts (
  short_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint saved_shorts_pkey PRIMARY KEY (short_id, user_id)
);
-- @table short_captions
create table if not exists public.short_captions (
  id uuid default gen_random_uuid() not null,
  short_id uuid not null,
  language text default 'en'::text not null,
  source text not null,
  status text default 'pending'::text not null,
  segments jsonb default '[]'::jsonb not null,
  error_message text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint short_captions_pkey PRIMARY KEY (id),
  constraint short_captions_short_id_language_key UNIQUE (short_id, language),
  constraint short_captions_source_check CHECK ((source = ANY (ARRAY['ai-generated'::text, 'creator-uploaded'::text]))),
  constraint short_captions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'failed'::text])))
);
-- @table short_comment_reactions
create table if not exists public.short_comment_reactions (
  id uuid default gen_random_uuid() not null,
  comment_id uuid not null,
  user_id uuid not null,
  reaction_type text not null,
  created_at timestamp with time zone default now() not null,
  constraint short_comment_reactions_pkey PRIMARY KEY (id),
  constraint short_comment_reactions_type_check CHECK ((reaction_type = ANY (ARRAY['like'::text, 'dislike'::text, 'love'::text, 'laugh'::text, 'wow'::text, 'sad'::text, 'angry'::text, 'fire'::text, 'clap'::text, 'support'::text]))),
  constraint short_comment_reactions_unique_user_comment UNIQUE (comment_id, user_id)
);
-- @table short_comments
create table if not exists public.short_comments (
  id uuid default gen_random_uuid() not null,
  short_id uuid,
  author_id uuid,
  content text not null,
  created_at timestamp with time zone default now(),
  parent_id uuid,
  audio_url text,
  video_url text,
  attachments jsonb default '[]'::jsonb not null,
  moderation_state text default 'visible'::text not null,
  moderation_reason text,
  moderated_at timestamp with time zone,
  constraint short_comments_moderation_state_check CHECK ((moderation_state = ANY (ARRAY['visible'::text, 'pending'::text, 'approved'::text, 'limited'::text, 'hidden'::text, 'removed'::text, 'appealed'::text, 'blocked'::text]))),
  constraint short_comments_pkey PRIMARY KEY (id)
);
-- @table short_gifts
create table if not exists public.short_gifts (
  id uuid default gen_random_uuid() not null,
  short_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  amount_minor bigint not null,
  transaction_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint short_gifts_amount_minor_check CHECK ((amount_minor > 0)),
  constraint short_gifts_pkey PRIMARY KEY (id)
);
-- @table short_likes
create table if not exists public.short_likes (
  short_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now(),
  reaction_type text default 'like'::text,
  constraint short_likes_pkey PRIMARY KEY (short_id, user_id),
  constraint valid_short_reaction CHECK ((reaction_type = ANY (ARRAY['like'::text, 'love'::text, 'laugh'::text, 'wow'::text, 'sad'::text, 'angry'::text])))
);
-- @table short_reposts
create table if not exists public.short_reposts (
  short_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint short_reposts_pkey PRIMARY KEY (short_id, user_id)
);
-- @table shorts
create table if not exists public.shorts (
  id uuid default gen_random_uuid() not null,
  author_id uuid,
  caption text,
  video_url text not null,
  like_count integer default 0,
  comment_count integer default 0,
  created_at timestamp with time zone default now(),
  view_count integer default 0,
  repost_count integer default 0,
  sound_name text,
  chapters jsonb default '[]'::jsonb,
  unlock_at timestamp with time zone,
  remixed_from_id uuid,
  category text default 'relax'::text,
  search_vector tsvector generated always as ((setweight(to_tsvector('english'::regconfig, COALESCE(caption, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(sound_name, ''::text)), 'B'::"char"))) stored,
  remix_of_short_id uuid,
  duet_of_short_id uuid,
  interaction_mode text default 'standard'::text not null,
  immersive_metadata jsonb default '{}'::jsonb not null,
  constraint shorts_category_check CHECK ((category = ANY (ARRAY['relax'::text, 'learn'::text]))),
  constraint shorts_interaction_mode_check CHECK ((interaction_mode = ANY (ARRAY['standard'::text, 'ar'::text, 'vr'::text, 'spatial'::text]))),
  constraint shorts_pkey PRIMARY KEY (id)
);
-- @table treasury_accounts
create table if not exists public.treasury_accounts (
  id uuid default gen_random_uuid() not null,
  owner_id uuid,
  scope treasury_scope not null,
  kind ledger_account_kind not null,
  asset_code text not null,
  asset_kind text not null,
  display_name text not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint treasury_accounts_asset_kind_check CHECK ((asset_kind = ANY (ARRAY['fiat'::text, 'crypto'::text, 'fresh-coin'::text, 'token'::text]))),
  constraint treasury_accounts_pkey PRIMARY KEY (id),
  constraint treasury_owner_scope_check CHECK ((((scope = 'user'::treasury_scope) AND (owner_id IS NOT NULL)) OR (scope = ANY (ARRAY['platform'::treasury_scope, 'owner'::treasury_scope]))))
);
-- @table treasury_entries
create table if not exists public.treasury_entries (
  id bigint generated always as identity not null,
  transaction_id uuid not null,
  account_id uuid not null,
  amount_minor bigint not null,
  direction text not null,
  created_at timestamp with time zone default now() not null,
  constraint treasury_entries_amount_minor_check CHECK ((amount_minor > 0)),
  constraint treasury_entries_direction_check CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text]))),
  constraint treasury_entries_pkey PRIMARY KEY (id)
);
-- @table treasury_payment_instruments
create table if not exists public.treasury_payment_instruments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  method_id text not null,
  family text not null,
  label text not null,
  display_hint text,
  currency_code text not null,
  metadata jsonb default '{}'::jsonb not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint treasury_payment_instruments_currency_code_check CHECK ((currency_code = upper(currency_code))),
  constraint treasury_payment_instruments_family_check CHECK ((family = ANY (ARRAY['mobile_money'::text, 'bank_transfer'::text, 'card'::text, 'digital_wallet'::text, 'crypto_onchain'::text, 'instant_rail'::text, 'agent_cash'::text, 'ussd_banking'::text]))),
  constraint treasury_payment_instruments_label_check CHECK ((length(TRIM(BOTH FROM label)) > 0)),
  constraint treasury_payment_instruments_pkey PRIMARY KEY (id)
);
-- @table treasury_rail_requests
create table if not exists public.treasury_rail_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  direction text not null,
  method_id text not null,
  family text not null,
  amount_minor bigint not null,
  currency_code text not null,
  instrument_id uuid,
  status text default 'pending'::text not null,
  external_reference text,
  failure_reason text,
  ledger_transaction_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint treasury_rail_requests_amount_minor_check CHECK ((amount_minor > 0)),
  constraint treasury_rail_requests_currency_code_check CHECK ((currency_code = upper(currency_code))),
  constraint treasury_rail_requests_direction_check CHECK ((direction = ANY (ARRAY['deposit'::text, 'withdrawal'::text]))),
  constraint treasury_rail_requests_pkey PRIMARY KEY (id),
  constraint treasury_rail_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'awaiting_user'::text, 'processing'::text, 'settled'::text, 'failed'::text, 'cancelled'::text])))
);
-- @table treasury_transactions
create table if not exists public.treasury_transactions (
  id uuid default gen_random_uuid() not null,
  reference text not null,
  idempotency_key text,
  created_by uuid not null,
  description text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint treasury_transactions_idempotency_key_key UNIQUE (idempotency_key),
  constraint treasury_transactions_pkey PRIMARY KEY (id),
  constraint treasury_transactions_reference_key UNIQUE (reference)
);
-- @table universal_interactions
create table if not exists public.universal_interactions (
  id uuid default gen_random_uuid() not null,
  actor_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  interaction_type text not null,
  interaction_value text,
  parent_id uuid,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  state_key text generated always as (
CASE
    WHEN (interaction_type = ANY (ARRAY['react'::text, 'vote'::text, 'save'::text, 'follow'::text, 'repost'::text, 'quote'::text])) THEN interaction_type
    ELSE NULL::text
END) stored,
  constraint universal_interactions_pkey PRIMARY KEY (id),
  constraint universal_interactions_target_type_check CHECK ((target_type = ANY (ARRAY['short'::text, 'video'::text, 'post'::text, 'text'::text, 'image'::text, 'gallery'::text, 'audio'::text, 'podcast'::text, 'live'::text, 'news'::text, 'article'::text, 'story'::text, 'poll'::text, 'comment'::text, 'reply'::text, 'quote'::text, 'remix'::text, 'duet'::text, 'learning'::text, 'knowledge'::text, 'marketplace'::text, 'profile'::text, 'ar'::text, 'vr'::text, 'mixed'::text]))),
  constraint universal_interactions_type_check CHECK ((interaction_type = ANY (ARRAY['react'::text, 'comment'::text, 'reply'::text, 'save'::text, 'share'::text, 'repost'::text, 'quote'::text, 'vote'::text, 'remix'::text, 'duet'::text, 'collaborate'::text, 'follow'::text])))
);
-- @table universal_profiles
create table if not exists public.universal_profiles (
  user_id uuid not null,
  headline text,
  bio text,
  avatar_seed text,
  cover_image_url text,
  profile_visibility text default 'public'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint universal_profiles_pkey PRIMARY KEY (user_id),
  constraint universal_profiles_profile_visibility_check CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text])))
);
-- @table user_public_profiles
create table if not exists public.user_public_profiles (
  id uuid not null,
  username text not null,
  full_name text default ''::text not null,
  verified boolean default false not null,
  presence text default 'offline'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint user_public_profiles_pkey PRIMARY KEY (id)
);
-- @table users
create table if not exists public.users (
  id uuid default gen_random_uuid() not null,
  username text not null,
  email text not null,
  full_name text not null,
  role text default 'user'::text not null,
  verified boolean default false not null,
  presence text default 'offline'::text not null,
  identity jsonb default '{}'::jsonb not null,
  preferences jsonb default '{}'::jsonb not null,
  stats jsonb default '{}'::jsonb not null,
  security jsonb default '{}'::jsonb not null,
  subscription jsonb default '{}'::jsonb not null,
  linked_accounts jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint users_email_key UNIQUE (email),
  constraint users_pkey PRIMARY KEY (id),
  constraint users_username_key UNIQUE (username)
);
-- @table wallet_balances
create table if not exists public.wallet_balances (
  user_id uuid not null,
  balance integer default 0,
  updated_at timestamp with time zone default now(),
  constraint wallet_balances_balance_check CHECK ((balance >= 0)),
  constraint wallet_balances_pkey PRIMARY KEY (user_id)
);
-- @table wallet_transactions
create table if not exists public.wallet_transactions (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  amount integer not null,
  type text not null,
  description text,
  related_user_id uuid,
  created_at timestamp with time zone default now(),
  constraint wallet_transactions_pkey PRIMARY KEY (id),
  constraint wallet_transactions_type_check CHECK ((type = ANY (ARRAY['tip_sent'::text, 'tip_received'::text, 'grant'::text, 'purchase'::text])))
);
-- @table wallets
create table if not exists public.wallets (
  user_id uuid not null,
  balance numeric(12,2) default 0 not null,
  currency text default 'USD'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint wallets_pkey PRIMARY KEY (user_id)
);

-- @foreign_keys
-- 135 foreign keys, added only when the constraint is missing. A key whose referenced table does not
-- exist yet is skipped with a notice instead of failing, so this block is safe to run at any point.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('community_note_votes','community_note_votes_note_id_fkey','FOREIGN KEY (note_id) REFERENCES public.community_notes(id) ON DELETE CASCADE'),
      ('community_note_votes','community_note_votes_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('community_notes','community_notes_author_id_fkey','FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('community_notes','community_notes_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('connection_requests','connection_requests_recipient_id_fkey','FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('connection_requests','connection_requests_requester_id_fkey','FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('creator_drafts','creator_drafts_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('direct_messages','direct_messages_recipient_id_fkey','FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('direct_messages','direct_messages_sender_id_fkey','FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('ecosystem_profiles','ecosystem_profiles_fresh_id_fkey','FOREIGN KEY (fresh_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('follows','follows_followed_id_fkey','FOREIGN KEY (followed_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('follows','follows_follower_id_fkey','FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('fresh_agents','fresh_agents_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_conversation_turns','fresh_ai_conversation_turns_conversation_id_fkey','FOREIGN KEY (conversation_id) REFERENCES public.fresh_ai_conversations(id) ON DELETE CASCADE'),
      ('fresh_ai_conversation_turns','fresh_ai_conversation_turns_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_conversations','fresh_ai_conversations_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_evaluations','fresh_ai_evaluations_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_feedback','fresh_ai_feedback_reviewed_by_fkey','FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_ai_feedback','fresh_ai_feedback_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_ai_improvement_proposals','fresh_ai_improvement_proposals_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_ai_knowledge','fresh_ai_knowledge_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_media_assets','fresh_ai_media_assets_conversation_id_fkey','FOREIGN KEY (conversation_id) REFERENCES public.fresh_ai_conversations(id) ON DELETE SET NULL'),
      ('fresh_ai_media_assets','fresh_ai_media_assets_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_memory','fresh_ai_memory_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_missions','fresh_ai_missions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_pipeline_events','fresh_ai_pipeline_events_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_ai_preference_pairs','fresh_ai_preference_pairs_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_ai_safety_events','fresh_ai_safety_events_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_ai_serving_metrics','fresh_ai_serving_metrics_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_communication_messages','fresh_communication_messages_sender_id_fkey','FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_communication_messages','fresh_communication_messages_thread_id_fkey','FOREIGN KEY (thread_id) REFERENCES public.fresh_communication_threads(id) ON DELETE CASCADE'),
      ('fresh_communication_threads','fresh_communication_threads_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_context_sessions','fresh_context_sessions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_courses','fresh_courses_creator_id_fkey','FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_creator_analytics','fresh_creator_analytics_creator_id_fkey','FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_economic_events','fresh_economic_events_actor_id_fkey','FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_flow_events','fresh_flow_events_actor_id_fkey','FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_id_account_memberships','fresh_id_account_memberships_account_id_fkey','FOREIGN KEY (account_id) REFERENCES public.fresh_id_accounts(id) ON DELETE CASCADE'),
      ('fresh_id_account_memberships','fresh_id_account_memberships_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_id_accounts','fresh_id_accounts_owner_user_id_fkey','FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('fresh_id_devices','fresh_id_devices_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_id_private_profiles','fresh_id_private_profiles_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_intelligence_arbitrations','fresh_intelligence_arbitrations_left_claim_id_fkey','FOREIGN KEY (left_claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_arbitrations','fresh_intelligence_arbitrations_right_claim_id_fkey','FOREIGN KEY (right_claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claim_evidence','fresh_intelligence_claim_evidence_claim_id_fkey','FOREIGN KEY (claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claim_evidence','fresh_intelligence_claim_evidence_evidence_id_fkey','FOREIGN KEY (evidence_id) REFERENCES public.fresh_intelligence_evidence(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claim_relations','fresh_intelligence_claim_relations_left_claim_id_fkey','FOREIGN KEY (left_claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claim_relations','fresh_intelligence_claim_relations_right_claim_id_fkey','FOREIGN KEY (right_claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claim_revisions','fresh_intelligence_claim_revisions_claim_id_fkey','FOREIGN KEY (claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claims','fresh_intelligence_claims_subject_entity_id_fkey','FOREIGN KEY (subject_entity_id) REFERENCES public.fresh_intelligence_entities(id) ON DELETE SET NULL'),
      ('fresh_intelligence_evidence','fresh_intelligence_evidence_source_id_fkey','FOREIGN KEY (source_id) REFERENCES public.fresh_intelligence_sources(id) ON DELETE SET NULL'),
      ('fresh_intelligence_evidence_lineage','fresh_intelligence_evidence_lineage_from_evidence_id_fkey','FOREIGN KEY (from_evidence_id) REFERENCES public.fresh_intelligence_evidence(id) ON DELETE CASCADE'),
      ('fresh_intelligence_evidence_lineage','fresh_intelligence_evidence_lineage_source_id_fkey','FOREIGN KEY (source_id) REFERENCES public.fresh_intelligence_sources(id) ON DELETE SET NULL'),
      ('fresh_intelligence_evidence_lineage','fresh_intelligence_evidence_lineage_to_evidence_id_fkey','FOREIGN KEY (to_evidence_id) REFERENCES public.fresh_intelligence_evidence(id) ON DELETE CASCADE'),
      ('fresh_intelligence_truth_decisions','fresh_intelligence_truth_decisions_claim_id_fkey','FOREIGN KEY (claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_knowledge_entity_aliases','fresh_knowledge_entity_aliases_entity_id_fkey','FOREIGN KEY (entity_id) REFERENCES public.fresh_intelligence_entities(id) ON DELETE CASCADE'),
      ('fresh_knowledge_entity_aliases','fresh_knowledge_entity_aliases_source_id_fkey','FOREIGN KEY (source_id) REFERENCES public.fresh_intelligence_sources(id) ON DELETE SET NULL'),
      ('fresh_knowledge_entity_relations','fresh_knowledge_entity_relations_claim_id_fkey','FOREIGN KEY (claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE SET NULL'),
      ('fresh_knowledge_entity_relations','fresh_knowledge_entity_relations_from_entity_id_fkey','FOREIGN KEY (from_entity_id) REFERENCES public.fresh_intelligence_entities(id) ON DELETE CASCADE'),
      ('fresh_knowledge_entity_relations','fresh_knowledge_entity_relations_source_id_fkey','FOREIGN KEY (source_id) REFERENCES public.fresh_intelligence_sources(id) ON DELETE SET NULL'),
      ('fresh_knowledge_entity_relations','fresh_knowledge_entity_relations_to_entity_id_fkey','FOREIGN KEY (to_entity_id) REFERENCES public.fresh_intelligence_entities(id) ON DELETE CASCADE'),
      ('fresh_marketplace_listings','fresh_marketplace_listings_seller_id_fkey','FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_media_assets','fresh_media_assets_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_media_jobs','fresh_media_jobs_asset_id_fkey','FOREIGN KEY (asset_id) REFERENCES public.fresh_media_assets(id) ON DELETE CASCADE'),
      ('fresh_memories','fresh_memories_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_opportunities','fresh_opportunities_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_projects','fresh_projects_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_projects','fresh_projects_workspace_id_fkey','FOREIGN KEY (workspace_id) REFERENCES public.fresh_workspaces(id) ON DELETE CASCADE'),
      ('fresh_search_documents','fresh_search_documents_object_id_fkey','FOREIGN KEY (object_id) REFERENCES public.fresh_universal_objects(id) ON DELETE CASCADE'),
      ('fresh_search_documents','fresh_search_documents_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_subscriptions','fresh_subscriptions_creator_id_fkey','FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_subscriptions','fresh_subscriptions_subscriber_id_fkey','FOREIGN KEY (subscriber_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_trust_audit','fresh_trust_audit_actor_id_fkey','FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('fresh_universal_objects','fresh_universal_objects_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_user_preferences','fresh_user_preferences_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_workspaces','fresh_workspaces_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('ledger_entries','ledger_entries_account_id_fkey','FOREIGN KEY (account_id) REFERENCES public.treasury_accounts(id)'),
      ('ledger_entries','ledger_entries_transaction_id_fkey','FOREIGN KEY (transaction_id) REFERENCES public.ledger_transactions(id)'),
      ('ledger_transactions','ledger_transactions_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id)'),
      ('marketplace_listings','marketplace_listings_creator_id_fkey','FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('marketplace_purchases','marketplace_purchases_buyer_id_fkey','FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('marketplace_purchases','marketplace_purchases_creator_id_fkey','FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('marketplace_purchases','marketplace_purchases_listing_id_fkey','FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT'),
      ('notifications','notifications_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('post_comments','post_comments_author_id_fkey','FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('post_comments','post_comments_parent_id_fkey','FOREIGN KEY (parent_id) REFERENCES public.post_comments(id) ON DELETE CASCADE'),
      ('post_comments','post_comments_post_id_fkey','FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE'),
      ('post_likes','post_likes_post_id_fkey','FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE'),
      ('post_likes','post_likes_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('posts','posts_author_id_fkey','FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('profile_details','profile_details_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('profile_links','profile_links_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('profile_portfolio_items','profile_portfolio_items_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('profile_privacy_settings','profile_privacy_settings_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('profile_projects','profile_projects_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('reports','reports_reporter_id_fkey','FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('saved_posts','saved_posts_post_id_fkey','FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE'),
      ('saved_posts','saved_posts_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('saved_shorts','saved_shorts_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('saved_shorts','saved_shorts_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('short_captions','short_captions_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('short_captions','short_captions_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('short_comment_reactions','short_comment_reactions_comment_id_fkey','FOREIGN KEY (comment_id) REFERENCES public.short_comments(id) ON DELETE CASCADE'),
      ('short_comment_reactions','short_comment_reactions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('short_comments','short_comments_author_id_fkey','FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('short_comments','short_comments_parent_id_fkey','FOREIGN KEY (parent_id) REFERENCES public.short_comments(id) ON DELETE CASCADE'),
      ('short_comments','short_comments_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('short_gifts','short_gifts_recipient_id_fkey','FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('short_gifts','short_gifts_sender_id_fkey','FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('short_gifts','short_gifts_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('short_gifts','short_gifts_transaction_id_fkey','FOREIGN KEY (transaction_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT'),
      ('short_likes','short_likes_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('short_likes','short_likes_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('short_reposts','short_reposts_short_id_fkey','FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('short_reposts','short_reposts_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('shorts','shorts_author_id_fkey','FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('shorts','shorts_duet_of_short_id_fkey','FOREIGN KEY (duet_of_short_id) REFERENCES public.shorts(id) ON DELETE SET NULL'),
      ('shorts','shorts_remix_of_short_id_fkey','FOREIGN KEY (remix_of_short_id) REFERENCES public.shorts(id) ON DELETE SET NULL'),
      ('shorts','shorts_remixed_from_id_fkey','FOREIGN KEY (remixed_from_id) REFERENCES public.shorts(id) ON DELETE SET NULL'),
      ('treasury_accounts','treasury_accounts_owner_id_fkey','FOREIGN KEY (owner_id) REFERENCES auth.users(id)'),
      ('treasury_entries','treasury_entries_account_id_fkey','FOREIGN KEY (account_id) REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT'),
      ('treasury_entries','treasury_entries_transaction_id_fkey','FOREIGN KEY (transaction_id) REFERENCES public.treasury_transactions(id) ON DELETE RESTRICT'),
      ('treasury_payment_instruments','treasury_payment_instruments_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('treasury_rail_requests','treasury_rail_requests_instrument_id_fkey','FOREIGN KEY (instrument_id) REFERENCES public.treasury_payment_instruments(id) ON DELETE SET NULL'),
      ('treasury_rail_requests','treasury_rail_requests_ledger_transaction_id_fkey','FOREIGN KEY (ledger_transaction_id) REFERENCES public.treasury_transactions(id) ON DELETE SET NULL'),
      ('treasury_rail_requests','treasury_rail_requests_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('treasury_transactions','treasury_transactions_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('universal_interactions','universal_interactions_actor_id_fkey','FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('universal_interactions','universal_interactions_parent_id_fkey','FOREIGN KEY (parent_id) REFERENCES public.universal_interactions(id) ON DELETE CASCADE'),
      ('universal_profiles','universal_profiles_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('user_public_profiles','user_public_profiles_id_fkey','FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('wallet_balances','wallet_balances_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('wallet_transactions','wallet_transactions_related_user_id_fkey','FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL'),
      ('wallet_transactions','wallet_transactions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('wallets','wallets_user_id_fkey','FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE')
    ) as v(tbl, name, def)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is not null
       and not exists (
         select 1 from pg_constraint
         where conname = r.name and conrelid = to_regclass('public.' || quote_ident(r.tbl))
       ) then
      begin
        execute format('alter table public.%I add constraint %I %s', r.tbl, r.name, r.def);
      exception
        when undefined_table or undefined_column then
          raise notice 'skipped % (referenced object not present yet)', r.name;
      end;
    end if;
  end loop;
end
$$;

-- @indexes

CREATE INDEX IF NOT EXISTS community_note_votes_user_idx ON public.community_note_votes USING btree (user_id);
CREATE INDEX IF NOT EXISTS community_notes_author_idx ON public.community_notes USING btree (author_id);
CREATE INDEX IF NOT EXISTS community_notes_short_idx ON public.community_notes USING btree (short_id);
CREATE INDEX IF NOT EXISTS connection_requests_recipient_idx ON public.connection_requests USING btree (recipient_id, status);
CREATE INDEX IF NOT EXISTS connection_requests_requester_idx ON public.connection_requests USING btree (requester_id, status);
CREATE INDEX IF NOT EXISTS creator_drafts_user_created_idx ON public.creator_drafts USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_unread_idx ON public.direct_messages USING btree (recipient_id) WHERE (read_at IS NULL);
CREATE INDEX IF NOT EXISTS direct_messages_thread_idx ON public.direct_messages USING btree (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS ecosystem_profiles_ecosystem_id_idx ON public.ecosystem_profiles USING btree (ecosystem_id);
CREATE INDEX IF NOT EXISTS ecosystem_profiles_fresh_id_idx ON public.ecosystem_profiles USING btree (fresh_id);
CREATE INDEX IF NOT EXISTS follows_followed_idx ON public.follows USING btree (followed_id);
CREATE INDEX IF NOT EXISTS fresh_agents_owner_created_idx ON public.fresh_agents USING btree (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_turns_conversation_idx ON public.fresh_ai_conversation_turns USING btree (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS fresh_ai_turns_user_idx ON public.fresh_ai_conversation_turns USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_conversations_user_idx ON public.fresh_ai_conversations USING btree (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_evaluations_request_idx ON public.fresh_ai_evaluations USING btree (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_evaluations_user_idx ON public.fresh_ai_evaluations USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_feedback_owner_idx ON public.fresh_ai_feedback USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_feedback_request_id_idx ON public.fresh_ai_feedback USING btree (request_id);
CREATE INDEX IF NOT EXISTS fresh_ai_feedback_review_queue_idx ON public.fresh_ai_feedback USING btree (review_status, created_at) WHERE (training_opt_in = true);
CREATE INDEX IF NOT EXISTS fresh_ai_feedback_user_id_idx ON public.fresh_ai_feedback USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_fresh_ai_improvement_proposals_created_by ON public.fresh_ai_improvement_proposals USING btree (created_by);
CREATE INDEX IF NOT EXISTS fresh_ai_knowledge_search_tsv_idx ON public.fresh_ai_knowledge USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS fresh_ai_knowledge_user_idx ON public.fresh_ai_knowledge USING btree (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_media_conversation_idx ON public.fresh_ai_media_assets USING btree (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_media_user_idx ON public.fresh_ai_media_assets USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_memory_project_idx ON public.fresh_ai_memory USING btree (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_memory_user_idx ON public.fresh_ai_memory USING btree (user_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_missions_user_status_idx ON public.fresh_ai_missions USING btree (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_pipeline_events_created_at_idx ON public.fresh_ai_pipeline_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_pipeline_events_request_id_idx ON public.fresh_ai_pipeline_events USING btree (request_id);
CREATE INDEX IF NOT EXISTS idx_fresh_ai_pipeline_events_user_id ON public.fresh_ai_pipeline_events USING btree (user_id);
CREATE INDEX IF NOT EXISTS fresh_ai_preference_pairs_user_idx ON public.fresh_ai_preference_pairs USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_safety_events_request_idx ON public.fresh_ai_safety_events USING btree (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fresh_ai_safety_events_user_id ON public.fresh_ai_safety_events USING btree (user_id);
CREATE INDEX IF NOT EXISTS fresh_ai_serving_metrics_route_idx ON public.fresh_ai_serving_metrics USING btree (route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fresh_ai_serving_metrics_user_id ON public.fresh_ai_serving_metrics USING btree (user_id);
CREATE INDEX IF NOT EXISTS fresh_ai_training_examples_type_idx ON public.fresh_ai_training_examples USING btree (example_type, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_communication_messages_sender_idx ON public.fresh_communication_messages USING btree (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_communication_messages_thread_created_idx ON public.fresh_communication_messages USING btree (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_communication_threads_owner_idx ON public.fresh_communication_threads USING btree (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_context_sessions_user_seen_idx ON public.fresh_context_sessions USING btree (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS fresh_courses_creator_idx ON public.fresh_courses USING btree (creator_id);
CREATE INDEX IF NOT EXISTS fresh_courses_status_created_idx ON public.fresh_courses USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_creator_analytics_creator_date_idx ON public.fresh_creator_analytics USING btree (creator_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS fresh_economic_events_actor_idx ON public.fresh_economic_events USING btree (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS fresh_economic_events_occurred_at_idx ON public.fresh_economic_events USING btree (occurred_at DESC);
CREATE INDEX IF NOT EXISTS fresh_economic_events_source_idx ON public.fresh_economic_events USING btree (source_type, source_id);
CREATE INDEX IF NOT EXISTS fresh_economic_events_type_idx ON public.fresh_economic_events USING btree (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS fresh_flow_events_actor_created_idx ON public.fresh_flow_events USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_flow_events_media_created_idx ON public.fresh_flow_events USING btree (media_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_id_memberships_user_status_idx ON public.fresh_id_account_memberships USING btree (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_id_accounts_owner_created_idx ON public.fresh_id_accounts USING btree (owner_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS fresh_id_accounts_slug_unique ON public.fresh_id_accounts USING btree (lower(slug)) WHERE (slug IS NOT NULL);
CREATE INDEX IF NOT EXISTS fresh_id_devices_user_last_seen_idx ON public.fresh_id_devices USING btree (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS fresh_intelligence_arbitrations_left_idx ON public.fresh_intelligence_arbitrations USING btree (left_claim_id);
CREATE INDEX IF NOT EXISTS fresh_intelligence_arbitrations_right_idx ON public.fresh_intelligence_arbitrations USING btree (right_claim_id);
CREATE INDEX IF NOT EXISTS idx_fi_arbitrations_review ON public.fresh_intelligence_arbitrations USING btree (requires_human_review, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_intelligence_claim_evidence_evidence_idx ON public.fresh_intelligence_claim_evidence USING btree (evidence_id);
CREATE INDEX IF NOT EXISTS idx_fi_claim_evidence_claim ON public.fresh_intelligence_claim_evidence USING btree (claim_id);
CREATE INDEX IF NOT EXISTS fresh_intelligence_claim_relations_right_idx ON public.fresh_intelligence_claim_relations USING btree (right_claim_id);
CREATE INDEX IF NOT EXISTS idx_fi_relations_claims ON public.fresh_intelligence_claim_relations USING btree (left_claim_id, right_claim_id);
CREATE INDEX IF NOT EXISTS idx_fi_revisions_claim ON public.fresh_intelligence_claim_revisions USING btree (claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fi_claims_entity ON public.fresh_intelligence_claims USING btree (subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_fi_claims_status ON public.fresh_intelligence_claims USING btree (status);
CREATE INDEX IF NOT EXISTS idx_fi_claims_validity ON public.fresh_intelligence_claims USING btree (valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_fi_evidence_observed ON public.fresh_intelligence_evidence USING btree (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fi_evidence_source ON public.fresh_intelligence_evidence USING btree (source_id);
CREATE INDEX IF NOT EXISTS idx_fi_lineage_from ON public.fresh_intelligence_evidence_lineage USING btree (from_evidence_id);
CREATE INDEX IF NOT EXISTS idx_fi_lineage_relation ON public.fresh_intelligence_evidence_lineage USING btree (relation);
CREATE INDEX IF NOT EXISTS idx_fi_lineage_to ON public.fresh_intelligence_evidence_lineage USING btree (to_evidence_id);
CREATE INDEX IF NOT EXISTS idx_fresh_intelligence_evidence_lineage_source_id ON public.fresh_intelligence_evidence_lineage USING btree (source_id);
CREATE INDEX IF NOT EXISTS fresh_intelligence_truth_decisions_assessed_at_idx ON public.fresh_intelligence_truth_decisions USING btree (assessed_at DESC);
CREATE INDEX IF NOT EXISTS fresh_intelligence_truth_decisions_claim_id_idx ON public.fresh_intelligence_truth_decisions USING btree (claim_id);
CREATE INDEX IF NOT EXISTS idx_fkg_aliases_alias ON public.fresh_knowledge_entity_aliases USING btree (alias);
CREATE INDEX IF NOT EXISTS idx_fresh_knowledge_entity_aliases_source_id ON public.fresh_knowledge_entity_aliases USING btree (source_id);
CREATE INDEX IF NOT EXISTS idx_fkg_relations_claim ON public.fresh_knowledge_entity_relations USING btree (claim_id);
CREATE INDEX IF NOT EXISTS idx_fkg_relations_from ON public.fresh_knowledge_entity_relations USING btree (from_entity_id, relation);
CREATE INDEX IF NOT EXISTS idx_fkg_relations_to ON public.fresh_knowledge_entity_relations USING btree (to_entity_id, relation);
CREATE INDEX IF NOT EXISTS idx_fresh_knowledge_entity_relations_source_id ON public.fresh_knowledge_entity_relations USING btree (source_id);
CREATE INDEX IF NOT EXISTS fresh_marketplace_listings_seller_idx ON public.fresh_marketplace_listings USING btree (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_marketplace_listings_status_created_idx ON public.fresh_marketplace_listings USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_media_assets_owner_created_idx ON public.fresh_media_assets USING btree (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_media_jobs_asset_idx ON public.fresh_media_jobs USING btree (asset_id);
CREATE INDEX IF NOT EXISTS fresh_media_jobs_status_created_idx ON public.fresh_media_jobs USING btree (status, created_at);
CREATE INDEX IF NOT EXISTS fresh_memories_user_created_idx ON public.fresh_memories USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_opportunities_owner_idx ON public.fresh_opportunities USING btree (owner_id);
CREATE INDEX IF NOT EXISTS fresh_opportunities_status_created_idx ON public.fresh_opportunities USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_projects_owner_idx ON public.fresh_projects USING btree (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_projects_workspace_idx ON public.fresh_projects USING btree (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_search_documents_object_idx ON public.fresh_search_documents USING btree (object_id);
CREATE INDEX IF NOT EXISTS fresh_search_documents_owner_idx ON public.fresh_search_documents USING btree (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_subscriptions_creator_idx ON public.fresh_subscriptions USING btree (creator_id, status);
CREATE INDEX IF NOT EXISTS fresh_trust_audit_actor_created_idx ON public.fresh_trust_audit USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_universal_objects_kind_idx ON public.fresh_universal_objects USING btree (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_universal_objects_owner_created_idx ON public.fresh_universal_objects USING btree (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_workspaces_owner_idx ON public.fresh_workspaces USING btree (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON public.ledger_entries USING btree (account_id);
CREATE INDEX IF NOT EXISTS ledger_entries_transaction_idx ON public.ledger_entries USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS ledger_transactions_created_by_idx ON public.ledger_transactions USING btree (created_by);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_transactions_idempotency_key_uq ON public.ledger_transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS marketplace_listings_creator_idx ON public.marketplace_listings USING btree (creator_id);
CREATE INDEX IF NOT EXISTS marketplace_listings_status_idx ON public.marketplace_listings USING btree (status);
CREATE INDEX IF NOT EXISTS marketplace_purchases_buyer_idx ON public.marketplace_purchases USING btree (buyer_id);
CREATE INDEX IF NOT EXISTS marketplace_purchases_creator_idx ON public.marketplace_purchases USING btree (creator_id);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_purchases_idempotency_idx ON public.marketplace_purchases USING btree (((metadata ->> 'idempotency_key'::text))) WHERE (metadata ? 'idempotency_key'::text);
CREATE INDEX IF NOT EXISTS marketplace_purchases_listing_idx ON public.marketplace_purchases USING btree (listing_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);
CREATE INDEX IF NOT EXISTS post_comments_author_idx ON public.post_comments USING btree (author_id);
CREATE INDEX IF NOT EXISTS post_comments_moderation_idx ON public.post_comments USING btree (moderation_state);
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON public.post_comments USING btree (parent_id);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments USING btree (post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_idx ON public.post_likes USING btree (user_id);
CREATE INDEX IF NOT EXISTS posts_author_idx ON public.posts USING btree (author_id);
CREATE INDEX IF NOT EXISTS posts_search_vector_idx ON public.posts USING gin (search_vector);
CREATE INDEX IF NOT EXISTS profile_links_user_position_idx ON public.profile_links USING btree (user_id, "position");
CREATE INDEX IF NOT EXISTS profile_portfolio_user_position_idx ON public.profile_portfolio_items USING btree (user_id, "position");
CREATE INDEX IF NOT EXISTS profile_projects_user_position_idx ON public.profile_projects USING btree (user_id, "position");
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports USING btree (reporter_id);
CREATE INDEX IF NOT EXISTS saved_posts_user_idx ON public.saved_posts USING btree (user_id);
CREATE INDEX IF NOT EXISTS saved_shorts_user_idx ON public.saved_shorts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_short_captions_created_by ON public.short_captions USING btree (created_by);
CREATE INDEX IF NOT EXISTS short_captions_short_idx ON public.short_captions USING btree (short_id);
CREATE INDEX IF NOT EXISTS short_comment_reactions_comment_idx ON public.short_comment_reactions USING btree (comment_id);
CREATE INDEX IF NOT EXISTS short_comment_reactions_user_idx ON public.short_comment_reactions USING btree (user_id);
CREATE INDEX IF NOT EXISTS short_comments_author_idx ON public.short_comments USING btree (author_id);
CREATE INDEX IF NOT EXISTS short_comments_moderation_idx ON public.short_comments USING btree (moderation_state);
CREATE INDEX IF NOT EXISTS short_comments_parent_idx ON public.short_comments USING btree (parent_id);
CREATE INDEX IF NOT EXISTS short_comments_short_idx ON public.short_comments USING btree (short_id);
CREATE INDEX IF NOT EXISTS idx_short_gifts_recipient_id ON public.short_gifts USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS idx_short_gifts_sender_id ON public.short_gifts USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_short_gifts_transaction_id ON public.short_gifts USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS short_gifts_short_idx ON public.short_gifts USING btree (short_id);
CREATE INDEX IF NOT EXISTS short_likes_user_idx ON public.short_likes USING btree (user_id);
CREATE INDEX IF NOT EXISTS short_reposts_user_idx ON public.short_reposts USING btree (user_id);
CREATE INDEX IF NOT EXISTS shorts_author_idx ON public.shorts USING btree (author_id);
CREATE INDEX IF NOT EXISTS shorts_duet_of_short_idx ON public.shorts USING btree (duet_of_short_id);
CREATE INDEX IF NOT EXISTS shorts_remix_of_short_idx ON public.shorts USING btree (remix_of_short_id);
CREATE INDEX IF NOT EXISTS shorts_remixed_from_idx ON public.shorts USING btree (remixed_from_id);
CREATE INDEX IF NOT EXISTS shorts_search_vector_idx ON public.shorts USING gin (search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_accounts_active_asset_uq ON public.treasury_accounts USING btree (owner_id, scope, kind, asset_code, asset_kind) WHERE active;
CREATE INDEX IF NOT EXISTS treasury_accounts_owner_idx ON public.treasury_accounts USING btree (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_user_asset_unique ON public.treasury_accounts USING btree (owner_id, asset_code, asset_kind) WHERE ((scope = 'user'::treasury_scope) AND (kind = 'asset'::ledger_account_kind));
CREATE INDEX IF NOT EXISTS treasury_entries_account_idx ON public.treasury_entries USING btree (account_id, created_at);
CREATE INDEX IF NOT EXISTS treasury_entries_transaction_idx ON public.treasury_entries USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS treasury_payment_instruments_user_idx ON public.treasury_payment_instruments USING btree (user_id, active);
CREATE INDEX IF NOT EXISTS treasury_rail_requests_instrument_id_idx ON public.treasury_rail_requests USING btree (instrument_id);
CREATE INDEX IF NOT EXISTS treasury_rail_requests_ledger_transaction_id_idx ON public.treasury_rail_requests USING btree (ledger_transaction_id);
CREATE INDEX IF NOT EXISTS treasury_rail_requests_status_idx ON public.treasury_rail_requests USING btree (status) WHERE (status = ANY (ARRAY['pending'::text, 'awaiting_user'::text, 'processing'::text]));
CREATE INDEX IF NOT EXISTS treasury_rail_requests_user_idx ON public.treasury_rail_requests USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_created_by ON public.treasury_transactions USING btree (created_by);
CREATE INDEX IF NOT EXISTS universal_interactions_actor_idx ON public.universal_interactions USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS universal_interactions_actor_type_idx ON public.universal_interactions USING btree (actor_id, interaction_type);
CREATE INDEX IF NOT EXISTS universal_interactions_event_idx ON public.universal_interactions USING btree (target_type, target_id, interaction_type, created_at DESC) WHERE (state_key IS NULL);
CREATE INDEX IF NOT EXISTS universal_interactions_parent_idx ON public.universal_interactions USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS universal_interactions_state_uidx ON public.universal_interactions USING btree (actor_id, target_type, target_id, state_key) WHERE (state_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS universal_interactions_target_idx ON public.universal_interactions USING btree (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS universal_interactions_target_type_id_idx ON public.universal_interactions USING btree (target_type, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON public.users USING btree (lower(username)) WHERE ((username IS NOT NULL) AND (btrim(username) <> ''::text));
CREATE INDEX IF NOT EXISTS wallet_transactions_related_user_idx ON public.wallet_transactions USING btree (related_user_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions USING btree (user_id);

-- @functions

-- @functions (part a)
CREATE OR REPLACE FUNCTION public.approve_fresh_ai_correction(p_pair_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_pair record;
  v_id uuid;
begin
  select * into v_pair from public.fresh_ai_preference_pairs where id = p_pair_id;
  if not found then
    raise exception 'Correction % was not found', p_pair_id using errcode = 'P0002';
  end if;
  if coalesce(v_pair.safety_checked, false) then
    raise exception 'Correction % was already approved', p_pair_id using errcode = '23505';
  end if;

  insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
  values (null, 'fresh-web-lite-platform', left(btrim(v_pair.prompt), 200), btrim(v_pair.preferred_output), 'text',
          'owner-approved-user-correction', jsonb_build_object('kind', 'user-correction', 'pair_id', v_pair.id),
          'PROBABLE', 0.8, jsonb_build_object('dataset', 'approved-corrections-v1'))
  returning id into v_id;

  update public.fresh_ai_preference_pairs set safety_checked = true, reward_signal = coalesce(reward_signal, 1) where id = p_pair_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assert_ledger_transaction_balanced(p_transaction_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  debit_total bigint;
  credit_total bigint;
begin
  select
    coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0),
    coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0)
  into debit_total, credit_total
  from public.ledger_entries
  where transaction_id = p_transaction_id;

  if debit_total = 0 or credit_total = 0 or debit_total <> credit_total then
    raise exception 'Ledger transaction % is not balanced', p_transaction_id;
  end if;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_fresh_id_account(p_account_type text, p_display_name text, p_slug text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_slug text := nullif(lower(btrim(coalesce(p_slug, ''))), '');
begin
  if v_user_id is null then
    raise exception 'Fresh ID sign-in is required'
      using errcode = '42501';
  end if;

  if p_account_type not in ('creator', 'business', 'developer', 'organization') then
    raise exception 'Unsupported Fresh account type'
      using errcode = '22023';
  end if;

  if char_length(v_display_name) < 2 or char_length(v_display_name) > 120 then
    raise exception 'Account display name must be between 2 and 120 characters'
      using errcode = '22023';
  end if;

  if v_slug is not null and v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$' then
    raise exception 'Account slug format is invalid'
      using errcode = '22023';
  end if;

  insert into public.fresh_id_accounts (owner_user_id, account_type, display_name, slug)
  values (v_user_id, p_account_type, v_display_name, v_slug)
  returning id into v_account_id;

  insert into public.fresh_id_account_memberships (account_id, user_id, membership_role, status)
  values (v_account_id, v_user_id, 'owner', 'active');

  return v_account_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_treasury_transaction(p_reference text, p_description text, p_entries jsonb, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_transaction_id uuid;
  v_entry jsonb;
  v_account_id uuid;
  v_amount bigint;
  v_direction text;
  v_debits bigint := 0;
  v_credits bigint := 0;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(p_reference), '') is null or nullif(trim(p_description), '') is null then
    raise exception 'Reference and description are required';
  end if;

  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 2 then
    raise exception 'At least two ledger entries are required';
  end if;

  insert into public.ledger_transactions(reference, created_by, description, metadata)
  values (p_reference, auth.uid(), p_description, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_transaction_id;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    begin
      v_account_id := (v_entry->>'accountId')::uuid;
      v_amount := (v_entry->>'amountMinor')::bigint;
      v_direction := v_entry->>'direction';
    exception when others then
      raise exception 'Invalid ledger entry format';
    end;

    if v_amount <= 0 or v_direction not in ('debit', 'credit') then
      raise exception 'Invalid ledger entry';
    end if;

    select owner_id into v_owner_id
    from public.treasury_accounts
    where id = v_account_id and active = true;

    if not found then
      raise exception 'Treasury account does not exist or is inactive';
    end if;

    if v_owner_id is not null and v_owner_id <> auth.uid() then
      raise exception 'Cannot post to another user account';
    end if;

    if v_direction = 'debit' then
      v_debits := v_debits + v_amount;
    else
      v_credits := v_credits + v_amount;
    end if;

    insert into public.ledger_entries(transaction_id, account_id, amount_minor, direction)
    values (v_transaction_id, v_account_id, v_amount, v_direction);
  end loop;

  if v_debits = 0 or v_debits <> v_credits then
    raise exception 'Ledger transaction is not balanced';
  end if;

  return v_transaction_id;
exception when others then
  raise;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_default_ecosystem_profiles()
 RETURNS SETOF ecosystem_profiles
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  defaults text[][] := array[
    array['fresh-flow','Fresh Flow','Shorts, social and discovery feed'],
    array['wallet','Fresh Wallet','Treasury balances and payment rails'],
    array['creator','Creator Studio','Publish shorts, posts and drafts'],
    array['marketplace','Marketplace','Listings and commerce'],
    array['ai','Fresh AI','Personal intelligence workspace'],
    array['messages','Messages','Direct messages and connections'],
    array['treasure','Treasure','Saved value and collections'],
    array['crypto','Crypto','On-chain assets and rails']
  ];
  row text[];
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  foreach row slice 1 in array defaults loop
    insert into public.ecosystem_profiles(
      fresh_id,ecosystem_id,title,description,enabled,level,feed_modes,metadata
    ) values(
      v_uid,row[1],row[2],row[3],true,1,
      case when row[1]='fresh-flow' then array['for-you','social','learn','relax','others','fresh-picks'] else array[]::text[] end,
      jsonb_build_object('bootstrapped',true)
    ) on conflict(fresh_id,ecosystem_id) do nothing;
  end loop;
  return query select * from public.ecosystem_profiles where fresh_id=v_uid order by title;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_profile_details_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profile_details (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_fresh_id_private_profile_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.date_of_birth is not null and new.date_of_birth > (current_date - interval '13 years')::date then
      raise exception 'Fresh ID requires the minimum age of 13';
    end if;
    if new.signup_consent_version is null then
      raise exception 'Fresh ID signup consent is required';
    end if;
    if new.signup_consent_version is not null then
      if new.signup_consent_version <> '2026-10-14' then
        raise exception 'Unsupported Fresh ID consent version';
      end if;
      new.signup_consent_at := now();
    else
      new.signup_consent_at := null;
    end if;
  elsif new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'Fresh ID date of birth cannot be edited after account creation';
  elsif new.signup_consent_version is distinct from old.signup_consent_version
     or new.signup_consent_at is distinct from old.signup_consent_at then
    raise exception 'Fresh ID signup consent audit fields cannot be edited';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_short_views(short_id_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.shorts set view_count = view_count + 1 where id = short_id_input;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_fresh_id_account_member(p_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.fresh_id_account_memberships membership
    where membership.account_id = p_account_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_fresh_id_account_owner(p_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.fresh_id_accounts account
    where account.id = p_account_id
      and account.owner_user_id = auth.uid()
  );
$function$;

-- @functions (part b)
CREATE OR REPLACE FUNCTION public.persist_fresh_intelligence_research_graph(p_batch_key text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_existing_summary jsonb;
  v_summary jsonb;
begin
  if p_batch_key is null or length(p_batch_key) < 1 or length(p_batch_key) > 300 then
    raise exception 'Invalid research persistence batch key';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Research persistence payload must be a JSON object';
  end if;
  if jsonb_typeof(coalesce(p_payload->'entities', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'sources', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'claims', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'evidence', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'claim_evidence', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'relations', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'arbitrations', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'truth_decisions', '[]'::jsonb)) <> 'array' then
    raise exception 'Research persistence collections must be JSON arrays';
  end if;

  insert into public.fresh_intelligence_persistence_batches(batch_key, summary)
  values (p_batch_key, '{}'::jsonb)
  on conflict (batch_key) do nothing;

  if not found then
    select b.summary into v_existing_summary
    from public.fresh_intelligence_persistence_batches as b
    where b.batch_key = p_batch_key;
    return jsonb_build_object('persisted', false, 'alreadyPersisted', true, 'summary', coalesce(v_existing_summary, '{}'::jsonb));
  end if;

  insert into public.fresh_intelligence_entities(id, entity_type, label, attributes, updated_at)
  select r.id, r.entity_type, r.label, coalesce(r.attributes, '[]'::jsonb), coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_payload->'entities', '[]'::jsonb))
    as r(id text, entity_type text, label text, attributes jsonb, updated_at timestamptz)
  on conflict (id) do update set entity_type = excluded.entity_type, label = excluded.label,
    attributes = excluded.attributes, updated_at = excluded.updated_at;

  insert into public.fresh_intelligence_sources(id, provider, name, url, reliability, metadata)
  select r.id, r.provider, r.name, r.url, r.reliability, coalesce(r.metadata, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb))
    as r(id text, provider text, name text, url text, reliability numeric, metadata jsonb)
  on conflict (id) do update set provider = excluded.provider, name = excluded.name, url = excluded.url,
    reliability = excluded.reliability, metadata = excluded.metadata;

  insert into public.fresh_intelligence_claims(
    id, subject_entity_id, predicate, object, normalized_text, status, confidence,
    first_observed_at, last_observed_at, valid_from, valid_to, updated_at
  )
  select r.id, r.subject_entity_id, r.predicate, r.object, r.normalized_text, r.status, r.confidence,
    r.first_observed_at, r.last_observed_at, r.valid_from, r.valid_to, coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_payload->'claims', '[]'::jsonb))
    as r(id text, subject_entity_id text, predicate text, object jsonb, normalized_text text, status text,
      confidence numeric, first_observed_at timestamptz, last_observed_at timestamptz,
      valid_from timestamptz, valid_to timestamptz, updated_at timestamptz)
  on conflict (id) do update set subject_entity_id = excluded.subject_entity_id, predicate = excluded.predicate,
    object = excluded.object, normalized_text = excluded.normalized_text, status = excluded.status,
    confidence = excluded.confidence, first_observed_at = excluded.first_observed_at,
    last_observed_at = excluded.last_observed_at, valid_from = excluded.valid_from,
    valid_to = excluded.valid_to, updated_at = excluded.updated_at;

  insert into public.fresh_intelligence_evidence(
    id, claim_text, source_id, source_url, source_title, provider, observed_at, published_at, confidence, supports
  )
  select r.id, r.claim_text, r.source_id, r.source_url, r.source_title, r.provider, r.observed_at,
    r.published_at, r.confidence, r.supports
  from jsonb_to_recordset(coalesce(p_payload->'evidence', '[]'::jsonb))
    as r(id text, claim_text text, source_id text, source_url text, source_title text, provider text,
      observed_at timestamptz, published_at timestamptz, confidence numeric, supports boolean)
  on conflict (id) do update set claim_text = excluded.claim_text, source_id = excluded.source_id,
    source_url = excluded.source_url, source_title = excluded.source_title, provider = excluded.provider,
    observed_at = excluded.observed_at, published_at = excluded.published_at,
    confidence = excluded.confidence, supports = excluded.supports;

  insert into public.fresh_intelligence_claim_evidence(claim_id, evidence_id, stance, stance_confidence)
  select distinct on (r.claim_id, r.evidence_id) r.claim_id, r.evidence_id, r.stance, r.stance_confidence
  from jsonb_to_recordset(coalesce(p_payload->'claim_evidence', '[]'::jsonb))
    as r(claim_id text, evidence_id text, stance text, stance_confidence numeric)
  order by r.claim_id, r.evidence_id, r.stance_confidence desc nulls last
  on conflict (claim_id, evidence_id) do update set stance = excluded.stance, stance_confidence = excluded.stance_confidence;

  insert into public.fresh_intelligence_claim_relations(
    left_claim_id, right_claim_id, relation, confidence, rationale, observed_at
  )
  select distinct on (r.left_claim_id, r.right_claim_id, r.relation)
    r.left_claim_id, r.right_claim_id, r.relation, r.confidence, r.rationale, coalesce(r.observed_at, now())
  from jsonb_to_recordset(coalesce(p_payload->'relations', '[]'::jsonb))
    as r(left_claim_id text, right_claim_id text, relation text, confidence numeric, rationale text, observed_at timestamptz)
  order by r.left_claim_id, r.right_claim_id, r.relation, r.confidence desc
  on conflict (left_claim_id, right_claim_id, relation) do update set
    confidence = excluded.confidence, rationale = excluded.rationale, observed_at = excluded.observed_at;

  insert into public.fresh_intelligence_arbitrations(
    left_claim_id, right_claim_id, decision, confidence, rationale, requires_human_review,
    retained_claim_ids, superseded_claim_ids
  )
  select distinct on (r.left_claim_id, r.right_claim_id, r.decision)
    r.left_claim_id, r.right_claim_id, r.decision, r.confidence, r.rationale,
    coalesce(r.requires_human_review, false), coalesce(r.retained_claim_ids, '{}'::text[]),
    coalesce(r.superseded_claim_ids, '{}'::text[])
  from jsonb_to_recordset(coalesce(p_payload->'arbitrations', '[]'::jsonb))
    as r(left_claim_id text, right_claim_id text, decision text, confidence numeric, rationale text,
      requires_human_review boolean, retained_claim_ids text[], superseded_claim_ids text[])
  order by r.left_claim_id, r.right_claim_id, r.decision, r.confidence desc;

  insert into public.fresh_intelligence_truth_decisions(
    claim_id, decision, actionable, calibrated_confidence, temporal_status, reasons, assessed_at
  )
  select r.claim_id, r.decision, r.actionable, r.calibrated_confidence, r.temporal_status,
    coalesce(r.reasons, '[]'::jsonb), r.assessed_at
  from jsonb_to_recordset(coalesce(p_payload->'truth_decisions', '[]'::jsonb))
    as r(claim_id text, decision text, actionable boolean, calibrated_confidence numeric,
      temporal_status text, reasons jsonb, assessed_at timestamptz);

  v_summary := jsonb_build_object(
    'entities', jsonb_array_length(coalesce(p_payload->'entities', '[]'::jsonb)),
    'sources', jsonb_array_length(coalesce(p_payload->'sources', '[]'::jsonb)),
    'claims', jsonb_array_length(coalesce(p_payload->'claims', '[]'::jsonb)),
    'evidence', jsonb_array_length(coalesce(p_payload->'evidence', '[]'::jsonb)),
    'claimEvidence', jsonb_array_length(coalesce(p_payload->'claim_evidence', '[]'::jsonb)),
    'relations', jsonb_array_length(coalesce(p_payload->'relations', '[]'::jsonb)),
    'arbitrations', jsonb_array_length(coalesce(p_payload->'arbitrations', '[]'::jsonb)),
    'truthDecisions', jsonb_array_length(coalesce(p_payload->'truth_decisions', '[]'::jsonb))
  );
  update public.fresh_intelligence_persistence_batches set summary = v_summary where batch_key = p_batch_key;
  return jsonb_build_object('persisted', true, 'alreadyPersisted', false, 'summary', v_summary);
end;
$function$;

-- @functions (part c)
CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_role text := coalesce(auth.role(), '');
  v_jwt_email text;
begin
  if v_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null or new.id is distinct from auth.uid() then
      raise exception 'Fresh ID profile must belong to the authenticated user'
        using errcode = '42501';
    end if;

    v_jwt_email := auth.jwt() ->> 'email';
    if v_jwt_email is null or btrim(v_jwt_email) = '' then
      raise exception 'Fresh ID profile email must come from the authenticated identity'
        using errcode = '42501';
    end if;

    new.email := v_jwt_email;
    new.role := 'user';
    new.verified := false;
    new.presence := 'online';
    new.identity := '{}'::jsonb;
    new.stats := jsonb_build_object(
      'followerCount', 0,
      'followingCount', 0,
      'postCount', 0,
      'reputationScore', 0
    );
    new.security := jsonb_build_object('twoFactorEnabled', false);
    new.subscription := jsonb_build_object('tier', 'free', 'isTrial', false);
    new.linked_accounts := '[]'::jsonb;
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.verified is distinct from old.verified
      or new.presence is distinct from old.presence
      or (new.identity -> 'verificationLevel') is distinct from (old.identity -> 'verificationLevel')
      or (new.identity -> 'kycStatus') is distinct from (old.identity -> 'kycStatus')
      or new.stats is distinct from old.stats
      or new.security is distinct from old.security
      or new.subscription is distinct from old.subscription
      or new.linked_accounts is distinct from old.linked_accounts
      or new.created_at is distinct from old.created_at then
      raise exception 'Fresh ID identity, security, role, and entitlement fields are server-managed'
        using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reject_ledger_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  raise exception 'Ledger records are immutable';
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_fresh_platform_knowledge(p_query text, p_limit integer DEFAULT 4)
 RETURNS TABLE(id uuid, title text, content text, source text, confidence numeric, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with terms as (
    select string_agg(quote_literal(w), ' | ') as expr
    from regexp_split_to_table(lower(coalesce(p_query, '')), '[^a-z0-9]+') as w
    where length(w) > 1
      and w not in ('fresh','lite','web','tell','show','about','please')
  ), q as (
    select case when expr is null then null else to_tsquery('english', expr) end as tsq from terms
  )
  select k.id, k.title, k.content, k.source, k.confidence::numeric, ts_rank_cd(k.search_tsv, q.tsq) as rank
  from public.fresh_ai_knowledge k, q
  where q.tsq is not null
    and k.project_id = 'fresh-web-lite-platform'
    and k.user_id is null
    and k.search_tsv @@ q.tsq
  order by (position(lower(k.title) in lower(coalesce(p_query, ''))) > 0) desc, rank desc, k.title
  limit least(greatest(coalesce(p_limit, 4), 1), 10);
$function$;

CREATE OR REPLACE FUNCTION public.search_posts_fulltext(p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, author_id uuid, content text, image_url text, like_count integer, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select p.id, p.author_id, p.content, p.image_url, p.like_count,
         ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.posts p
  where p.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.search_shorts_fulltext(p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, author_id uuid, caption text, sound_name text, video_url text, like_count integer, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select s.id, s.author_id, s.caption, s.sound_name, s.video_url, s.like_count,
         ts_rank(s.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.shorts s
  where s.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.send_tip(sender_id uuid, recipient_id uuid, tip_amount integer, tip_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sender_balance int;
begin
  if tip_amount <= 0 then
    raise exception 'Tip amount must be positive';
  end if;

  select balance into sender_balance from public.wallet_balances where user_id = sender_id for update;

  if sender_balance is null or sender_balance < tip_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.wallet_balances set balance = balance - tip_amount, updated_at = now() where user_id = sender_id;

  insert into public.wallet_balances (user_id, balance)
  values (recipient_id, tip_amount)
  on conflict (user_id) do update set balance = wallet_balances.balance + tip_amount, updated_at = now();

  insert into public.wallet_transactions (user_id, amount, type, description, related_user_id)
  values (sender_id, -tip_amount, 'tip_sent', tip_note, recipient_id);

  insert into public.wallet_transactions (user_id, amount, type, description, related_user_id)
  values (recipient_id, tip_amount, 'tip_received', tip_note, sender_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_universal_interaction_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_universal_interaction_to_short_legacy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reaction text;
begin
  if tg_op = 'DELETE' then
    if old.target_type <> 'short' then
      return old;
    end if;

    if old.interaction_type = 'react' then
      delete from public.short_likes where short_id = old.target_id and user_id = old.actor_id;
    elsif old.interaction_type = 'repost' then
      delete from public.short_reposts where short_id = old.target_id and user_id = old.actor_id;
    elsif old.interaction_type = 'save' then
      delete from public.saved_shorts where short_id = old.target_id and user_id = old.actor_id;
    end if;

    return old;
  end if;

  if new.target_type <> 'short' then
    return new;
  end if;

  if new.interaction_type = 'react' then
    v_reaction := new.interaction_value;
    if v_reaction is null or v_reaction not in ('like','love','laugh','wow','sad','angry') then
      v_reaction := 'like';
    end if;

    insert into public.short_likes (short_id, user_id, reaction_type)
    values (new.target_id, new.actor_id, v_reaction)
    on conflict (short_id, user_id) do update set reaction_type = excluded.reaction_type;
  elsif new.interaction_type = 'repost' then
    insert into public.short_reposts (short_id, user_id)
    values (new.target_id, new.actor_id)
    on conflict (short_id, user_id) do nothing;
  elsif new.interaction_type = 'save' then
    insert into public.saved_shorts (short_id, user_id)
    values (new.target_id, new.actor_id)
    on conflict (short_id, user_id) do nothing;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_public_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.user_public_profiles(id,username,full_name,verified,presence,created_at)
  values(new.id,new.username,coalesce(new.full_name,''),coalesce(new.verified,false),coalesce(new.presence,'offline'),coalesce(new.created_at,now()))
  on conflict (id) do update set
    username=excluded.username,
    full_name=excluded.full_name,
    verified=excluded.verified,
    presence=excluded.presence;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_connection_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_creator_draft()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin new.updated_at = now(); return new; end; $function$;

CREATE OR REPLACE FUNCTION public.touch_fresh_ai_mission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_profile_details()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_assert_transaction_balanced(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  debit_total bigint;
  credit_total bigint;
  entry_count integer;
begin
  select count(*),
         coalesce(sum(amount_minor) filter (where direction = 'debit'), 0),
         coalesce(sum(amount_minor) filter (where direction = 'credit'), 0)
    into entry_count, debit_total, credit_total
  from public.treasury_entries
  where transaction_id = p_transaction_id;

  if entry_count < 2 or debit_total <> credit_total then
    raise exception 'Treasury transaction % is not balanced', p_transaction_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_asset_kind_for_currency(p_currency text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case upper(trim(p_currency))
    when 'FRESH' then 'fresh-coin'
    when 'BTC' then 'crypto'
    when 'ETH' then 'crypto'
    when 'USDT' then 'crypto'
    when 'USDC' then 'crypto'
    else 'fiat'
  end;
$function$;

-- @functions (part d)
CREATE OR REPLACE FUNCTION public.treasury_create_and_sandbox_settle_rail_request(p_actor_id uuid, p_direction text, p_method_id text, p_family text, p_amount_minor bigint, p_currency_code text, p_instrument_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_tx uuid;
begin
  v_id := public.treasury_create_rail_request(
    p_actor_id,p_direction,p_method_id,p_family,p_amount_minor,p_currency_code,p_instrument_id,
    coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('sandbox',true)
  );
  v_tx := public.treasury_sandbox_settle_rail_request(p_actor_id,v_id);
  return jsonb_build_object('request_id',v_id,'ledger_transaction_id',v_tx,'status','settled','sandbox',true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_create_rail_request(p_actor_id uuid, p_direction text, p_method_id text, p_family text, p_amount_minor bigint, p_currency_code text, p_instrument_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_direction not in ('deposit','withdrawal') then raise exception 'Invalid direction'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'Amount must be positive'; end if;
  if length(trim(coalesce(p_method_id,''))) < 2 then raise exception 'Method required'; end if;

  insert into public.treasury_rail_requests(
    user_id,direction,method_id,family,amount_minor,currency_code,instrument_id,status,metadata
  ) values (
    p_actor_id,p_direction,trim(p_method_id),trim(p_family),p_amount_minor,
    upper(trim(p_currency_code)),p_instrument_id,'pending',coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_ensure_platform_settlement_account(p_asset_code text, p_asset_kind text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_code text := upper(trim(p_asset_code));
begin
  if v_code !~ '^[A-Z0-9_]{2,24}$' then
    raise exception 'Invalid asset code';
  end if;
  if p_asset_kind not in ('fiat', 'crypto', 'fresh-coin', 'token') then
    raise exception 'Invalid asset kind';
  end if;

  select id into v_id
  from public.treasury_accounts
  where scope = 'platform'
    and kind = 'liability'
    and asset_code = v_code
    and active
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.treasury_accounts(
    owner_id, scope, kind, asset_code, asset_kind, display_name, active
  ) values (
    null, 'platform', 'liability', v_code, p_asset_kind,
    'External settlement clearing · ' || v_code, true
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_ensure_user_account(p_actor_id uuid, p_asset_code text, p_asset_kind text, p_display_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_account_id uuid;
  v_code text := upper(trim(p_asset_code));
  v_name text := coalesce(nullif(trim(p_display_name), ''), 'Fresh Wallet ' || v_code);
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if v_code !~ '^[A-Z0-9_]{2,24}$' then raise exception 'Invalid asset code'; end if;
  if p_asset_kind not in ('fiat','crypto','fresh-coin','token') then raise exception 'Invalid asset kind'; end if;

  insert into public.treasury_accounts(owner_id, scope, kind, asset_code, asset_kind, display_name)
  values (p_actor_id, 'user', 'asset', v_code, p_asset_kind, v_name)
  on conflict do nothing;

  select id into v_account_id
  from public.treasury_accounts
  where owner_id = p_actor_id and scope = 'user' and kind = 'asset'
    and asset_code = v_code and active
  limit 1;

  return v_account_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_resolve_recipient(p_actor_id uuid, p_username text, p_asset_code text DEFAULT 'FRESH'::text)
 RETURNS TABLE(account_id uuid, display_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_recipient_id uuid;
  v_code text := upper(trim(p_asset_code));
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;

  select id into v_recipient_id from public.users
  where username = trim(p_username) limit 1;

  if v_recipient_id is null then raise exception 'No Fresh user found with that username'; end if;
  if v_recipient_id = p_actor_id then raise exception 'You cannot send Fresh Coin to yourself'; end if;

  return query
  select a.id, a.display_name
  from public.treasury_accounts a
  where a.owner_id = v_recipient_id and a.scope = 'user' and a.kind = 'asset'
    and a.asset_code = v_code and a.active
  limit 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_resolve_recipient_by_id(p_actor_id uuid, p_recipient_id uuid, p_asset_code text DEFAULT 'FRESH'::text)
 RETURNS TABLE(account_id uuid, display_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := upper(trim(p_asset_code));
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_recipient_id = p_actor_id then raise exception 'You cannot gift yourself'; end if;

  return query
  select a.id, a.display_name
  from public.treasury_accounts a
  where a.owner_id = p_recipient_id and a.scope = 'user' and a.kind = 'asset'
    and a.asset_code = v_code and a.active
  limit 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_sandbox_settle_rail_request(p_actor_id uuid, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_req public.treasury_rail_requests;
  v_user_account_id uuid;
  v_platform_account_id uuid;
  v_asset_kind text;
  v_balance bigint;
  v_tx_id uuid;
  v_reference text;
  v_idem text;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;

  select * into v_req from public.treasury_rail_requests
  where id = p_request_id for update;

  if v_req.id is null then raise exception 'Rail request not found'; end if;
  if v_req.user_id <> p_actor_id then raise exception 'Not your rail request'; end if;
  if v_req.status = 'settled' and v_req.ledger_transaction_id is not null then return v_req.ledger_transaction_id; end if;
  if v_req.status not in ('pending','awaiting_user','processing') then
    raise exception 'Request status % cannot be settled', v_req.status;
  end if;

  v_asset_kind := public.treasury_asset_kind_for_currency(v_req.currency_code);
  v_idem := 'sandbox-rail-' || v_req.id::text;

  select id into v_tx_id from public.treasury_transactions where idempotency_key = v_idem;
  if v_tx_id is not null then
    update public.treasury_rail_requests
    set status='settled', ledger_transaction_id=v_tx_id,
        external_reference=coalesce(external_reference,'SANDBOX-'||replace(v_req.id::text,'-','')),
        updated_at=now(), metadata=metadata||jsonb_build_object('sandbox',true,'settled_at',now())
    where id=v_req.id;
    return v_tx_id;
  end if;

  select id into v_user_account_id from public.treasury_accounts
  where owner_id=p_actor_id and scope='user' and kind='asset'
    and asset_code=upper(v_req.currency_code) and active limit 1;

  if v_user_account_id is null then
    insert into public.treasury_accounts(owner_id,scope,kind,asset_code,asset_kind,display_name)
    values(p_actor_id,'user','asset',upper(v_req.currency_code),v_asset_kind,upper(v_req.currency_code)||' wallet')
    returning id into v_user_account_id;
  end if;

  perform 1 from public.treasury_accounts where id=v_user_account_id for update;
  v_platform_account_id := public.treasury_ensure_platform_settlement_account(upper(v_req.currency_code),v_asset_kind);
  perform 1 from public.treasury_accounts where id=v_platform_account_id for update;

  if v_req.direction='withdrawal' then
    select balance_minor into v_balance from public.treasury_account_balances where account_id=v_user_account_id;
    if coalesce(v_balance,0) < v_req.amount_minor then
      update public.treasury_rail_requests set status='failed',failure_reason='Insufficient balance for withdrawal',updated_at=now() where id=v_req.id;
      raise exception 'Insufficient balance for withdrawal';
    end if;
  end if;

  v_reference := 'SANDBOX-RAIL-' || replace(v_req.id::text,'-','');

  insert into public.treasury_transactions(reference,idempotency_key,created_by,description,metadata)
  values(v_reference,v_idem,p_actor_id,format('Sandbox %s via %s',v_req.direction,v_req.method_id),
    jsonb_build_object('sandbox',true,'rail_request_id',v_req.id,'method_id',v_req.method_id,'family',v_req.family,'direction',v_req.direction))
  returning id into v_tx_id;

  if v_req.direction='deposit' then
    insert into public.treasury_entries(transaction_id,account_id,amount_minor,direction)
    values(v_tx_id,v_user_account_id,v_req.amount_minor,'debit'),(v_tx_id,v_platform_account_id,v_req.amount_minor,'credit');
  else
    insert into public.treasury_entries(transaction_id,account_id,amount_minor,direction)
    values(v_tx_id,v_user_account_id,v_req.amount_minor,'credit'),(v_tx_id,v_platform_account_id,v_req.amount_minor,'debit');
  end if;

  perform public.treasury_assert_transaction_balanced(v_tx_id);

  update public.treasury_rail_requests
  set status='settled',ledger_transaction_id=v_tx_id,external_reference=v_reference,failure_reason=null,
      updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('sandbox',true,'settled_at',now())
  where id=v_req.id;

  return v_tx_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_transfer_internal(p_actor_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount_minor bigint, p_idempotency_key text, p_description text DEFAULT 'Fresh internal transfer'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_from public.treasury_accounts;
  v_to public.treasury_accounts;
  v_balance bigint;
  v_transaction_id uuid;
  v_reference text;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_amount_minor <= 0 then raise exception 'Transfer amount must be positive'; end if;
  if p_from_account_id = p_to_account_id then raise exception 'Source and destination accounts must differ'; end if;
  if length(trim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'A strong idempotency key is required'; end if;

  select id into v_transaction_id from public.treasury_transactions
  where idempotency_key=p_idempotency_key and created_by=p_actor_id;
  if v_transaction_id is not null then return v_transaction_id; end if;

  perform 1 from public.treasury_accounts
  where id in (p_from_account_id,p_to_account_id) order by id for update;

  select * into v_from from public.treasury_accounts where id=p_from_account_id;
  select * into v_to from public.treasury_accounts where id=p_to_account_id;

  if v_from.id is null or v_to.id is null then raise exception 'Treasury account not found'; end if;
  if v_from.scope <> 'user' or v_to.scope <> 'user' then raise exception 'Internal transfer is restricted to user accounts'; end if;
  if v_from.owner_id <> p_actor_id then raise exception 'You do not control the source treasury account'; end if;
  if not v_from.active or not v_to.active then raise exception 'Treasury account is inactive'; end if;
  if v_from.kind <> 'asset' or v_to.kind <> 'asset' then raise exception 'Internal transfer requires asset accounts'; end if;
  if v_from.asset_code <> v_to.asset_code or v_from.asset_kind <> v_to.asset_kind then raise exception 'Source and destination assets must match'; end if;

  select balance_minor into v_balance from public.treasury_account_balances where account_id=v_from.id;
  if coalesce(v_balance,0) < p_amount_minor then raise exception 'Insufficient available balance'; end if;

  v_reference := 'FW-' || replace(gen_random_uuid()::text,'-','');

  insert into public.treasury_transactions(reference,idempotency_key,created_by,description)
  values(v_reference,p_idempotency_key,p_actor_id,p_description)
  returning id into v_transaction_id;

  insert into public.treasury_entries(transaction_id,account_id,amount_minor,direction)
  values(v_transaction_id,v_to.id,p_amount_minor,'debit'),(v_transaction_id,v_from.id,p_amount_minor,'credit');

  perform public.treasury_assert_transaction_balanced(v_transaction_id);
  return v_transaction_id;
exception
  when unique_violation then
    select id into v_transaction_id from public.treasury_transactions
    where idempotency_key=p_idempotency_key and created_by=p_actor_id;
    if v_transaction_id is not null then return v_transaction_id; end if;
    raise;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_note_vote_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    if new.is_helpful then
      update public.community_notes set helpful_count = helpful_count + 1 where id = new.note_id;
    else
      update public.community_notes set not_helpful_count = not_helpful_count + 1 where id = new.note_id;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.is_helpful then
      update public.community_notes set helpful_count = helpful_count - 1 where id = old.note_id;
    else
      update public.community_notes set not_helpful_count = not_helpful_count - 1 where id = old.note_id;
    end if;
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_post_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = comment_count - 1 where id = old.post_id;
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_post_like_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = like_count - 1 where id = old.post_id;
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_short_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    update public.shorts set comment_count = comment_count + 1 where id = new.short_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.shorts set comment_count = comment_count - 1 where id = old.short_id;
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_short_like_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    update public.shorts set like_count = like_count + 1 where id = new.short_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.shorts set like_count = like_count - 1 where id = old.short_id;
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_short_repost_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    update public.shorts set repost_count = repost_count + 1 where id = new.short_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.shorts set repost_count = repost_count - 1 where id = old.short_id;
    return old;
  end if;
  return null;
end;
$function$;

-- Function execute privileges. Production revokes the default PUBLIC/anon/authenticated execute on most
-- functions. Functions not listed here keep the default grants (the guard/touch/treasury_assert/asset_kind helpers).
do $$
declare
  r record;
  f regprocedure;
begin
  for r in
    select * from (values
      ('approve_fresh_ai_correction', 'service_role'),
      ('assert_ledger_transaction_balanced', 'service_role'),
      ('create_treasury_transaction', 'service_role'),
      ('ensure_profile_details_for_user', 'service_role'),
      ('increment_short_views', 'service_role'),
      ('persist_fresh_intelligence_research_graph', 'service_role'),
      ('protect_users_privileged_columns', 'service_role'),
      ('reject_ledger_mutation', 'service_role'),
      ('rls_auto_enable', 'service_role'),
      ('search_fresh_platform_knowledge', 'service_role'),
      ('send_tip', 'service_role'),
      ('sync_universal_interaction_to_short_legacy', 'service_role'),
      ('sync_user_public_profile', 'service_role'),
      ('treasury_create_and_sandbox_settle_rail_request', 'service_role'),
      ('treasury_create_rail_request', 'service_role'),
      ('treasury_ensure_platform_settlement_account', 'service_role'),
      ('treasury_ensure_user_account', 'service_role'),
      ('treasury_resolve_recipient', 'service_role'),
      ('treasury_resolve_recipient_by_id', 'service_role'),
      ('treasury_sandbox_settle_rail_request', 'service_role'),
      ('treasury_transfer_internal', 'service_role'),
      ('update_note_vote_counts', 'service_role'),
      ('update_post_comment_count', 'service_role'),
      ('update_post_like_count', 'service_role'),
      ('update_short_comment_count', 'service_role'),
      ('update_short_like_count', 'service_role'),
      ('update_short_repost_count', 'service_role'),
      ('create_fresh_id_account', 'authenticated,service_role'),
      ('ensure_default_ecosystem_profiles', 'authenticated,service_role'),
      ('is_fresh_id_account_member', 'authenticated,service_role'),
      ('is_fresh_id_account_owner', 'authenticated,service_role'),
      ('search_posts_fulltext', 'anon,authenticated,service_role'),
      ('search_shorts_fulltext', 'anon,authenticated,service_role')
    ) as v(fname, roles)
  loop
    for f in
      select p.oid::regprocedure from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.proname = r.fname
    loop
      execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
      execute format('grant execute on function %s to %s', f, r.roles);
    end loop;
  end loop;
end
$$;

-- @rls
-- Row-level security is enabled on every table in the public schema (94 of 94).
-- fresh_ai_feedback additionally forces RLS for the table owner.
do $$
declare
  t text;
begin
  foreach t in array array[
    'community_note_votes','community_notes','connection_requests','creator_drafts','direct_messages',
    'ecosystem_profiles','follows','fresh_agents','fresh_ai_capabilities','fresh_ai_conversation_turns',
    'fresh_ai_conversations','fresh_ai_evaluations','fresh_ai_feedback','fresh_ai_improvement_proposals',
    'fresh_ai_knowledge','fresh_ai_media_assets','fresh_ai_memory','fresh_ai_missions','fresh_ai_pipeline_events',
    'fresh_ai_preference_pairs','fresh_ai_safety_events','fresh_ai_serving_metrics','fresh_ai_training_examples',
    'fresh_communication_messages','fresh_communication_threads','fresh_context_sessions','fresh_courses',
    'fresh_creator_analytics','fresh_economic_events','fresh_flow_events','fresh_id_account_memberships',
    'fresh_id_accounts','fresh_id_devices','fresh_id_private_profiles','fresh_intelligence_arbitrations',
    'fresh_intelligence_claim_evidence','fresh_intelligence_claim_relations','fresh_intelligence_claim_revisions',
    'fresh_intelligence_claims','fresh_intelligence_entities','fresh_intelligence_evidence',
    'fresh_intelligence_evidence_lineage','fresh_intelligence_persistence_batches','fresh_intelligence_sources',
    'fresh_intelligence_truth_decisions','fresh_knowledge_entity_aliases','fresh_knowledge_entity_relations',
    'fresh_marketplace_listings','fresh_media_assets','fresh_media_jobs','fresh_memories','fresh_opportunities',
    'fresh_projects','fresh_search_documents','fresh_subscriptions','fresh_trust_audit','fresh_universal_objects',
    'fresh_user_preferences','fresh_workspaces','ledger_entries','ledger_transactions','marketplace_listings',
    'marketplace_purchases','notifications','post_comments','post_likes','posts','profile_details','profile_links',
    'profile_portfolio_items','profile_privacy_settings','profile_projects','reports','saved_posts','saved_shorts',
    'short_captions','short_comment_reactions','short_comments','short_gifts','short_likes','short_reposts','shorts',
    'treasury_accounts','treasury_entries','treasury_payment_instruments','treasury_rail_requests',
    'treasury_transactions','universal_interactions','universal_profiles','user_public_profiles','users',
    'wallet_balances','wallet_transactions','wallets'
  ]
  loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
  if to_regclass('public.fresh_ai_feedback') is not null then
    alter table public.fresh_ai_feedback force row level security;
  end if;
end
$$;

-- @policies

drop policy if exists "Note votes viewable by everyone" on public.community_note_votes;
create policy "Note votes viewable by everyone" on public.community_note_votes for select to public
  using (true);
drop policy if exists "Users can change their vote" on public.community_note_votes;
create policy "Users can change their vote" on public.community_note_votes for delete to public
  using (auth.uid() = user_id);
drop policy if exists "Users can vote on notes" on public.community_note_votes;
create policy "Users can vote on notes" on public.community_note_votes for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "Notes viewable by everyone" on public.community_notes;
create policy "Notes viewable by everyone" on public.community_notes for select to public
  using (true);
drop policy if exists "Users can add notes" on public.community_notes;
create policy "Users can add notes" on public.community_notes for insert to public
  with check (auth.uid() = author_id);
drop policy if exists "connection requests participants read" on public.connection_requests;
create policy "connection requests participants read" on public.connection_requests for select to authenticated
  using ((( SELECT auth.uid() AS uid) = requester_id) OR (( SELECT auth.uid() AS uid) = recipient_id));
drop policy if exists "connection requests recipient response" on public.connection_requests;
create policy "connection requests recipient response" on public.connection_requests for update to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = 'pending'::text))
  with check ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = ANY (ARRAY['accepted'::text, 'declined'::text])));
drop policy if exists "connection requests requester insert" on public.connection_requests;
create policy "connection requests requester insert" on public.connection_requests for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = requester_id) AND (requester_id <> recipient_id) AND (status = 'pending'::text));
drop policy if exists "connection requests requester state transition" on public.connection_requests;
create policy "connection requests requester state transition" on public.connection_requests for update to authenticated
  using ((( SELECT auth.uid() AS uid) = requester_id) AND (status = ANY (ARRAY['pending'::text, 'declined'::text, 'cancelled'::text])))
  with check ((( SELECT auth.uid() AS uid) = requester_id) AND (status = ANY (ARRAY['pending'::text, 'cancelled'::text])));
drop policy if exists "creator drafts owner delete" on public.creator_drafts;
create policy "creator drafts owner delete" on public.creator_drafts for delete to public
  using (auth.uid() = user_id);
drop policy if exists "creator drafts owner insert" on public.creator_drafts;
create policy "creator drafts owner insert" on public.creator_drafts for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "creator drafts owner read" on public.creator_drafts;
create policy "creator drafts owner read" on public.creator_drafts for select to public
  using (auth.uid() = user_id);
drop policy if exists "creator drafts owner update" on public.creator_drafts;
create policy "creator drafts owner update" on public.creator_drafts for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "direct messages participant read" on public.direct_messages;
create policy "direct messages participant read" on public.direct_messages for select to authenticated
  using ((auth.uid() = sender_id) OR (auth.uid() = recipient_id));
drop policy if exists "direct messages recipient mark read" on public.direct_messages;
create policy "direct messages recipient mark read" on public.direct_messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
drop policy if exists "direct messages sender insert" on public.direct_messages;
create policy "direct messages sender insert" on public.direct_messages for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1 FROM connection_requests cr WHERE ((cr.status = 'accepted'::text) AND (((cr.requester_id = ( SELECT auth.uid() AS uid)) AND (cr.recipient_id = direct_messages.recipient_id)) OR ((cr.recipient_id = ( SELECT auth.uid() AS uid)) AND (cr.requester_id = direct_messages.recipient_id)))))));
drop policy if exists "ecosystem profiles are publicly readable when enabled" on public.ecosystem_profiles;
create policy "ecosystem profiles are publicly readable when enabled" on public.ecosystem_profiles for select to public
  using ((enabled = true) OR (auth.uid() = fresh_id));
drop policy if exists "ecosystem_profiles_delete_own" on public.ecosystem_profiles;
create policy "ecosystem_profiles_delete_own" on public.ecosystem_profiles for delete to authenticated
  using (fresh_id = auth.uid());
drop policy if exists "ecosystem_profiles_insert_own" on public.ecosystem_profiles;
create policy "ecosystem_profiles_insert_own" on public.ecosystem_profiles for insert to authenticated
  with check (fresh_id = auth.uid());
drop policy if exists "ecosystem_profiles_select_own" on public.ecosystem_profiles;
create policy "ecosystem_profiles_select_own" on public.ecosystem_profiles for select to authenticated
  using (fresh_id = auth.uid());
drop policy if exists "ecosystem_profiles_update_own" on public.ecosystem_profiles;
create policy "ecosystem_profiles_update_own" on public.ecosystem_profiles for update to authenticated
  using (fresh_id = auth.uid())
  with check (fresh_id = auth.uid());
drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone" on public.follows for select to public
  using (true);
drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others" on public.follows for insert to public
  with check (auth.uid() = follower_id);
drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows for delete to public
  using (auth.uid() = follower_id);
drop policy if exists "fresh_agents_owner" on public.fresh_agents;
create policy "fresh_agents_owner" on public.fresh_agents for all to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh_ai_capabilities_read" on public.fresh_ai_capabilities;
create policy "fresh_ai_capabilities_read" on public.fresh_ai_capabilities for select to public
  using (auth.role() = 'authenticated'::text);
drop policy if exists "fresh_ai_turns_owner" on public.fresh_ai_conversation_turns;
create policy "fresh_ai_turns_owner" on public.fresh_ai_conversation_turns for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_conversations_owner" on public.fresh_ai_conversations;
create policy "fresh_ai_conversations_owner" on public.fresh_ai_conversations for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_evaluations_owner" on public.fresh_ai_evaluations;
create policy "fresh_ai_evaluations_owner" on public.fresh_ai_evaluations for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_feedback_insert_own" on public.fresh_ai_feedback;
create policy "fresh_ai_feedback_insert_own" on public.fresh_ai_feedback for insert to authenticated
  with check ((auth.uid() = user_id) AND (training_opt_in = true) AND (consent_version = 'fresh-ai-feedback-consent-v1'::text) AND (authorization_id IS NOT NULL) AND (review_status = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL));
drop policy if exists "fresh_ai_feedback_select_own" on public.fresh_ai_feedback;
create policy "fresh_ai_feedback_select_own" on public.fresh_ai_feedback for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "fresh_ai_improvement_owner" on public.fresh_ai_improvement_proposals;
create policy "fresh_ai_improvement_owner" on public.fresh_ai_improvement_proposals for select to public
  using (auth.uid() = created_by);
drop policy if exists "fresh_ai_knowledge_owner" on public.fresh_ai_knowledge;
create policy "fresh_ai_knowledge_owner" on public.fresh_ai_knowledge for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_media_owner" on public.fresh_ai_media_assets;
create policy "fresh_ai_media_owner" on public.fresh_ai_media_assets for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_memory_owner" on public.fresh_ai_memory;
create policy "fresh_ai_memory_owner" on public.fresh_ai_memory for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_missions_owner" on public.fresh_ai_missions;
create policy "fresh_ai_missions_owner" on public.fresh_ai_missions for all to authenticated
  using (( SELECT auth.uid() AS uid) = user_id)
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh_ai_pipeline_events_insert_own" on public.fresh_ai_pipeline_events;
create policy "fresh_ai_pipeline_events_insert_own" on public.fresh_ai_pipeline_events for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "fresh_ai_pipeline_events_select_own" on public.fresh_ai_pipeline_events;
create policy "fresh_ai_pipeline_events_select_own" on public.fresh_ai_pipeline_events for select to authenticated
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh_ai_preference_owner" on public.fresh_ai_preference_pairs;
create policy "fresh_ai_preference_owner" on public.fresh_ai_preference_pairs for select to public
  using (auth.uid() = user_id);
drop policy if exists "fresh message owner insert" on public.fresh_communication_messages;
create policy "fresh message owner insert" on public.fresh_communication_messages for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1 FROM fresh_communication_threads t WHERE ((t.id = fresh_communication_messages.thread_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))));
drop policy if exists "fresh message thread owner select" on public.fresh_communication_messages;
create policy "fresh message thread owner select" on public.fresh_communication_messages for select to authenticated
  using (EXISTS ( SELECT 1 FROM fresh_communication_threads t WHERE ((t.id = fresh_communication_messages.thread_id) AND (t.owner_id = ( SELECT auth.uid() AS uid)))));
drop policy if exists "fresh thread owner insert" on public.fresh_communication_threads;
create policy "fresh thread owner insert" on public.fresh_communication_threads for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh thread owner select" on public.fresh_communication_threads;
create policy "fresh thread owner select" on public.fresh_communication_threads for select to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh thread owner update" on public.fresh_communication_threads;
create policy "fresh thread owner update" on public.fresh_communication_threads for update to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh_context_sessions_owner" on public.fresh_context_sessions;
create policy "fresh_context_sessions_owner" on public.fresh_context_sessions for all to authenticated
  using (( SELECT auth.uid() AS uid) = user_id)
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh_courses_owner" on public.fresh_courses;
create policy "fresh_courses_owner" on public.fresh_courses for all to authenticated
  using (( SELECT auth.uid() AS uid) = creator_id)
  with check (( SELECT auth.uid() AS uid) = creator_id);
drop policy if exists "fresh_courses_public" on public.fresh_courses;
create policy "fresh_courses_public" on public.fresh_courses for select to anon,authenticated
  using ((status = 'published'::text) OR (creator_id = ( SELECT auth.uid() AS uid)));
drop policy if exists "fresh_creator_analytics_owner" on public.fresh_creator_analytics;
create policy "fresh_creator_analytics_owner" on public.fresh_creator_analytics for select to authenticated
  using (( SELECT auth.uid() AS uid) = creator_id);
drop policy if exists "users can view their own economic events" on public.fresh_economic_events;
create policy "users can view their own economic events" on public.fresh_economic_events for select to public
  using (auth.uid() = actor_id);
drop policy if exists "fresh_flow_events_owner" on public.fresh_flow_events;
create policy "fresh_flow_events_owner" on public.fresh_flow_events for all to authenticated
  using (( SELECT auth.uid() AS uid) = actor_id)
  with check (( SELECT auth.uid() AS uid) = actor_id);
drop policy if exists "fresh_id_memberships_self_or_owner_read" on public.fresh_id_account_memberships;
create policy "fresh_id_memberships_self_or_owner_read" on public.fresh_id_account_memberships for select to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_fresh_id_account_owner(fresh_id_account_memberships.account_id) AS is_fresh_id_account_owner));
drop policy if exists "fresh_id_accounts_member_read" on public.fresh_id_accounts;
create policy "fresh_id_accounts_member_read" on public.fresh_id_accounts for select to authenticated
  using ((owner_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_fresh_id_account_member(fresh_id_accounts.id) AS is_fresh_id_account_member));
drop policy if exists "fresh_id_devices_insert_own" on public.fresh_id_devices;
create policy "fresh_id_devices_insert_own" on public.fresh_id_devices for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh_id_devices_select_own" on public.fresh_id_devices;
create policy "fresh_id_devices_select_own" on public.fresh_id_devices for select to authenticated
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh_id_devices_update_own" on public.fresh_id_devices;
create policy "fresh_id_devices_update_own" on public.fresh_id_devices for update to authenticated
  using (( SELECT auth.uid() AS uid) = user_id)
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can create their own Fresh ID private profile" on public.fresh_id_private_profiles;
create policy "Users can create their own Fresh ID private profile" on public.fresh_id_private_profiles for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can read their own Fresh ID private profile" on public.fresh_id_private_profiles;
create policy "Users can read their own Fresh ID private profile" on public.fresh_id_private_profiles for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can update their own Fresh ID private profile" on public.fresh_id_private_profiles;
create policy "Users can update their own Fresh ID private profile" on public.fresh_id_private_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "fresh intelligence arbitrations are readable" on public.fresh_intelligence_arbitrations;
create policy "fresh intelligence arbitrations are readable" on public.fresh_intelligence_arbitrations for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence claim evidence is readable" on public.fresh_intelligence_claim_evidence;
create policy "fresh intelligence claim evidence is readable" on public.fresh_intelligence_claim_evidence for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence claim relations are readable" on public.fresh_intelligence_claim_relations;
create policy "fresh intelligence claim relations are readable" on public.fresh_intelligence_claim_relations for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence claim revisions are readable" on public.fresh_intelligence_claim_revisions;
create policy "fresh intelligence claim revisions are readable" on public.fresh_intelligence_claim_revisions for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence claims are readable" on public.fresh_intelligence_claims;
create policy "fresh intelligence claims are readable" on public.fresh_intelligence_claims for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence entities are readable" on public.fresh_intelligence_entities;
create policy "fresh intelligence entities are readable" on public.fresh_intelligence_entities for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence evidence is readable" on public.fresh_intelligence_evidence;
create policy "fresh intelligence evidence is readable" on public.fresh_intelligence_evidence for select to anon,authenticated
  using (true);
drop policy if exists "fresh intelligence sources are readable" on public.fresh_intelligence_sources;
create policy "fresh intelligence sources are readable" on public.fresh_intelligence_sources for select to anon,authenticated
  using (true);
drop policy if exists "fresh_marketplace_delete" on public.fresh_marketplace_listings;
create policy "fresh_marketplace_delete" on public.fresh_marketplace_listings for delete to authenticated
  using (( SELECT auth.uid() AS uid) = seller_id);
drop policy if exists "fresh_marketplace_owner" on public.fresh_marketplace_listings;
create policy "fresh_marketplace_owner" on public.fresh_marketplace_listings for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = seller_id);
drop policy if exists "fresh_marketplace_public" on public.fresh_marketplace_listings;
create policy "fresh_marketplace_public" on public.fresh_marketplace_listings for select to anon,authenticated
  using ((status = 'published'::text) OR (seller_id = ( SELECT auth.uid() AS uid)));
drop policy if exists "fresh_marketplace_update" on public.fresh_marketplace_listings;
create policy "fresh_marketplace_update" on public.fresh_marketplace_listings for update to authenticated
  using (( SELECT auth.uid() AS uid) = seller_id)
  with check (( SELECT auth.uid() AS uid) = seller_id);
drop policy if exists "fresh_media_assets_owner" on public.fresh_media_assets;
create policy "fresh_media_assets_owner" on public.fresh_media_assets for all to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh_media_jobs_owner" on public.fresh_media_jobs;
create policy "fresh_media_jobs_owner" on public.fresh_media_jobs for select to authenticated
  using (EXISTS ( SELECT 1 FROM fresh_media_assets a WHERE ((a.id = fresh_media_jobs.asset_id) AND (a.owner_id = ( SELECT auth.uid() AS uid)))));
drop policy if exists "fresh_memories_owner" on public.fresh_memories;
create policy "fresh_memories_owner" on public.fresh_memories for all to authenticated
  using (( SELECT auth.uid() AS uid) = user_id)
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh_opportunities_owner" on public.fresh_opportunities;
create policy "fresh_opportunities_owner" on public.fresh_opportunities for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh_opportunities_public" on public.fresh_opportunities;
create policy "fresh_opportunities_public" on public.fresh_opportunities for select to anon,authenticated
  using ((status = 'open'::text) OR (owner_id = ( SELECT auth.uid() AS uid)));
drop policy if exists "fresh_opportunities_update" on public.fresh_opportunities;
create policy "fresh_opportunities_update" on public.fresh_opportunities for update to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh project owner" on public.fresh_projects;
create policy "fresh project owner" on public.fresh_projects for all to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh search owner delete" on public.fresh_search_documents;
create policy "fresh search owner delete" on public.fresh_search_documents for delete to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh search owner insert" on public.fresh_search_documents;
create policy "fresh search owner insert" on public.fresh_search_documents for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh search owner update" on public.fresh_search_documents;
create policy "fresh search owner update" on public.fresh_search_documents for update to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh search readable" on public.fresh_search_documents;
create policy "fresh search readable" on public.fresh_search_documents for select to authenticated
  using ((visibility = 'public'::text) OR (( SELECT auth.uid() AS uid) = owner_id));
drop policy if exists "fresh_subscriptions_owner" on public.fresh_subscriptions;
create policy "fresh_subscriptions_owner" on public.fresh_subscriptions for all to authenticated
  using (( SELECT auth.uid() AS uid) = subscriber_id)
  with check (( SELECT auth.uid() AS uid) = subscriber_id);
drop policy if exists "fresh_trust_audit_owner" on public.fresh_trust_audit;
create policy "fresh_trust_audit_owner" on public.fresh_trust_audit for select to authenticated
  using (( SELECT auth.uid() AS uid) = actor_id);
drop policy if exists "fresh objects owner delete" on public.fresh_universal_objects;
create policy "fresh objects owner delete" on public.fresh_universal_objects for delete to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh objects owner insert" on public.fresh_universal_objects;
create policy "fresh objects owner insert" on public.fresh_universal_objects for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh objects owner select" on public.fresh_universal_objects;
create policy "fresh objects owner select" on public.fresh_universal_objects for select to authenticated
  using ((( SELECT auth.uid() AS uid) = owner_id) OR (visibility = 'public'::text));
drop policy if exists "fresh objects owner update" on public.fresh_universal_objects;
create policy "fresh objects owner update" on public.fresh_universal_objects for update to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "fresh_user_preferences_owner" on public.fresh_user_preferences;
create policy "fresh_user_preferences_owner" on public.fresh_user_preferences for all to authenticated
  using (( SELECT auth.uid() AS uid) = user_id)
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "fresh workspace owner" on public.fresh_workspaces;
create policy "fresh workspace owner" on public.fresh_workspaces for all to authenticated
  using (( SELECT auth.uid() AS uid) = owner_id)
  with check (( SELECT auth.uid() AS uid) = owner_id);
drop policy if exists "marketplace_listings_creator_insert" on public.marketplace_listings;
create policy "marketplace_listings_creator_insert" on public.marketplace_listings for insert to authenticated
  with check (creator_id = auth.uid());
drop policy if exists "marketplace_listings_creator_read" on public.marketplace_listings;
create policy "marketplace_listings_creator_read" on public.marketplace_listings for select to authenticated
  using (creator_id = auth.uid());
drop policy if exists "marketplace_listings_creator_update" on public.marketplace_listings;
create policy "marketplace_listings_creator_update" on public.marketplace_listings for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
drop policy if exists "marketplace_listings_public_published_read" on public.marketplace_listings;
create policy "marketplace_listings_public_published_read" on public.marketplace_listings for select to anon,authenticated
  using (status = 'published'::text);
drop policy if exists "marketplace_purchases_buyer_read" on public.marketplace_purchases;
create policy "marketplace_purchases_buyer_read" on public.marketplace_purchases for select to authenticated
  using (buyer_id = auth.uid());
drop policy if exists "marketplace_purchases_creator_read" on public.marketplace_purchases;
create policy "marketplace_purchases_creator_read" on public.marketplace_purchases for select to authenticated
  using (creator_id = auth.uid());
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for all to public
  using (auth.uid() = user_id);
drop policy if exists "Comments viewable by everyone" on public.post_comments;
create policy "Comments viewable by everyone" on public.post_comments for select to public
  using (true);
drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments" on public.post_comments for delete to public
  using (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "Users can insert their own comments" on public.post_comments;
create policy "Users can insert their own comments" on public.post_comments for insert to public
  with check (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "Anyone can view likes" on public.post_likes;
create policy "Anyone can view likes" on public.post_likes for select to public
  using (true);
drop policy if exists "Users can like as themselves" on public.post_likes;
create policy "Users can like as themselves" on public.post_likes for insert to public
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can unlike their own like" on public.post_likes;
create policy "Users can unlike their own like" on public.post_likes for delete to public
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Anyone can view posts" on public.posts;
create policy "Anyone can view posts" on public.posts for select to public
  using (true);
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts for delete to public
  using (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts" on public.posts for insert to public
  with check (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "profile details owner delete" on public.profile_details;
create policy "profile details owner delete" on public.profile_details for delete to public
  using (auth.uid() = user_id);
drop policy if exists "profile details owner insert" on public.profile_details;
create policy "profile details owner insert" on public.profile_details for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "profile details owner update" on public.profile_details;
create policy "profile details owner update" on public.profile_details for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "profile details public read" on public.profile_details;
create policy "profile details public read" on public.profile_details for select to public
  using ((visibility = 'public'::text) OR (auth.uid() = user_id));
drop policy if exists "profile owner delete" on public.profile_links;
create policy "profile owner delete" on public.profile_links for delete to public
  using (auth.uid() = user_id);
drop policy if exists "profile owner insert" on public.profile_links;
create policy "profile owner insert" on public.profile_links for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "profile owner update" on public.profile_links;
create policy "profile owner update" on public.profile_links for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "profile public read" on public.profile_links;
create policy "profile public read" on public.profile_links for select to public
  using (true);
drop policy if exists "profile owner delete" on public.profile_portfolio_items;
create policy "profile owner delete" on public.profile_portfolio_items for delete to public
  using (auth.uid() = user_id);
drop policy if exists "profile owner insert" on public.profile_portfolio_items;
create policy "profile owner insert" on public.profile_portfolio_items for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "profile owner update" on public.profile_portfolio_items;
create policy "profile owner update" on public.profile_portfolio_items for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "profile public read" on public.profile_portfolio_items;
create policy "profile public read" on public.profile_portfolio_items for select to public
  using (true);
drop policy if exists "privacy settings owner insert" on public.profile_privacy_settings;
create policy "privacy settings owner insert" on public.profile_privacy_settings for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "privacy settings owner update" on public.profile_privacy_settings;
create policy "privacy settings owner update" on public.profile_privacy_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "privacy settings public read" on public.profile_privacy_settings;
create policy "privacy settings public read" on public.profile_privacy_settings for select to authenticated
  using (true);
drop policy if exists "profile owner delete" on public.profile_projects;
create policy "profile owner delete" on public.profile_projects for delete to public
  using (auth.uid() = user_id);
drop policy if exists "profile owner insert" on public.profile_projects;
create policy "profile owner insert" on public.profile_projects for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "profile owner update" on public.profile_projects;
create policy "profile owner update" on public.profile_projects for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "profile public read" on public.profile_projects;
create policy "profile public read" on public.profile_projects for select to public
  using (true);
drop policy if exists "Users can submit reports" on public.reports;
create policy "Users can submit reports" on public.reports for insert to public
  with check (auth.uid() = reporter_id);
drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports" on public.reports for select to public
  using (auth.uid() = reporter_id);
drop policy if exists "Users can save posts" on public.saved_posts;
create policy "Users can save posts" on public.saved_posts for insert to public
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can unsave posts" on public.saved_posts;
create policy "Users can unsave posts" on public.saved_posts for delete to public
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can view their own saved posts" on public.saved_posts;
create policy "Users can view their own saved posts" on public.saved_posts for select to public
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can save shorts" on public.saved_shorts;
create policy "Users can save shorts" on public.saved_shorts for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "Users can unsave shorts" on public.saved_shorts;
create policy "Users can unsave shorts" on public.saved_shorts for delete to public
  using (auth.uid() = user_id);
drop policy if exists "Users can view their own saved shorts" on public.saved_shorts;
create policy "Users can view their own saved shorts" on public.saved_shorts for select to public
  using (auth.uid() = user_id);
drop policy if exists "short captions author insert" on public.short_captions;
create policy "short captions author insert" on public.short_captions for insert to authenticated
  with check ((created_by = auth.uid()) AND (EXISTS ( SELECT 1 FROM shorts s WHERE ((s.id = short_captions.short_id) AND (s.author_id = auth.uid())))));
drop policy if exists "short captions author update" on public.short_captions;
create policy "short captions author update" on public.short_captions for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
drop policy if exists "short captions public read" on public.short_captions;
create policy "short captions public read" on public.short_captions for select to authenticated
  using ((status = 'ready'::text) OR (created_by = auth.uid()));
drop policy if exists "short_comment_reactions_delete" on public.short_comment_reactions;
create policy "short_comment_reactions_delete" on public.short_comment_reactions for delete to public
  using (auth.uid() = user_id);
drop policy if exists "short_comment_reactions_insert" on public.short_comment_reactions;
create policy "short_comment_reactions_insert" on public.short_comment_reactions for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "short_comment_reactions_select" on public.short_comment_reactions;
create policy "short_comment_reactions_select" on public.short_comment_reactions for select to public
  using (true);
drop policy if exists "short_comment_reactions_update" on public.short_comment_reactions;
create policy "short_comment_reactions_update" on public.short_comment_reactions for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Short comments viewable by everyone" on public.short_comments;
create policy "Short comments viewable by everyone" on public.short_comments for select to public
  using (true);
drop policy if exists "Users can delete their own short comments" on public.short_comments;
create policy "Users can delete their own short comments" on public.short_comments for delete to public
  using (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "Users can insert their own short comments" on public.short_comments;
create policy "Users can insert their own short comments" on public.short_comments for insert to public
  with check (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "short gifts public read" on public.short_gifts;
create policy "short gifts public read" on public.short_gifts for select to authenticated
  using (true);
drop policy if exists "short gifts sender insert" on public.short_gifts;
create policy "short gifts sender insert" on public.short_gifts for insert to authenticated
  with check (auth.uid() = sender_id);
drop policy if exists "Short likes viewable by everyone" on public.short_likes;
create policy "Short likes viewable by everyone" on public.short_likes for select to public
  using (true);
drop policy if exists "Users can like shorts" on public.short_likes;
create policy "Users can like shorts" on public.short_likes for insert to public
  with check (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can unlike shorts" on public.short_likes;
create policy "Users can unlike shorts" on public.short_likes for delete to public
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Reposts viewable by everyone" on public.short_reposts;
create policy "Reposts viewable by everyone" on public.short_reposts for select to public
  using (true);
drop policy if exists "Users can repost" on public.short_reposts;
create policy "Users can repost" on public.short_reposts for insert to public
  with check (auth.uid() = user_id);
drop policy if exists "Users can un-repost" on public.short_reposts;
create policy "Users can un-repost" on public.short_reposts for delete to public
  using (auth.uid() = user_id);
drop policy if exists "Shorts are viewable by everyone" on public.shorts;
create policy "Shorts are viewable by everyone" on public.shorts for select to public
  using (true);
drop policy if exists "Users can delete their own shorts" on public.shorts;
create policy "Users can delete their own shorts" on public.shorts for delete to public
  using (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "Users can insert their own shorts" on public.shorts;
create policy "Users can insert their own shorts" on public.shorts for insert to public
  with check (( SELECT auth.uid() AS uid) = author_id);
drop policy if exists "treasury_accounts_select_own" on public.treasury_accounts;
create policy "treasury_accounts_select_own" on public.treasury_accounts for select to authenticated
  using ((scope = 'user'::treasury_scope) AND (owner_id = auth.uid()));
drop policy if exists "treasury_accounts_user_select" on public.treasury_accounts;
create policy "treasury_accounts_user_select" on public.treasury_accounts for select to authenticated
  using ((scope = 'user'::treasury_scope) AND (owner_id = auth.uid()));
drop policy if exists "treasury_entries_select_own" on public.treasury_entries;
create policy "treasury_entries_select_own" on public.treasury_entries for select to authenticated
  using (EXISTS ( SELECT 1 FROM treasury_accounts a WHERE ((a.id = treasury_entries.account_id) AND (a.scope = 'user'::treasury_scope) AND (a.owner_id = auth.uid()))));
drop policy if exists "treasury_payment_instruments_delete_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_delete_own" on public.treasury_payment_instruments for delete to authenticated
  using (user_id = auth.uid());
drop policy if exists "treasury_payment_instruments_insert_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_insert_own" on public.treasury_payment_instruments for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "treasury_payment_instruments_select_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_select_own" on public.treasury_payment_instruments for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "treasury_payment_instruments_update_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_update_own" on public.treasury_payment_instruments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "treasury_rail_requests_insert_own" on public.treasury_rail_requests;
create policy "treasury_rail_requests_insert_own" on public.treasury_rail_requests for insert to authenticated
  with check ((user_id = auth.uid()) AND (status = 'pending'::text) AND (ledger_transaction_id IS NULL));
drop policy if exists "treasury_rail_requests_select_own" on public.treasury_rail_requests;
create policy "treasury_rail_requests_select_own" on public.treasury_rail_requests for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "treasury_transactions_select_own" on public.treasury_transactions;
create policy "treasury_transactions_select_own" on public.treasury_transactions for select to authenticated
  using (EXISTS ( SELECT 1 FROM (treasury_entries e JOIN treasury_accounts a ON ((a.id = e.account_id))) WHERE ((e.transaction_id = treasury_transactions.id) AND (a.scope = 'user'::treasury_scope) AND (a.owner_id = auth.uid()))));
drop policy if exists "universal_interactions_delete" on public.universal_interactions;
create policy "universal_interactions_delete" on public.universal_interactions for delete to public
  using (auth.uid() = actor_id);
drop policy if exists "universal_interactions_insert" on public.universal_interactions;
create policy "universal_interactions_insert" on public.universal_interactions for insert to public
  with check (auth.uid() = actor_id);
drop policy if exists "universal_interactions_select" on public.universal_interactions;
create policy "universal_interactions_select" on public.universal_interactions for select to public
  using (true);
drop policy if exists "universal_interactions_update" on public.universal_interactions;
create policy "universal_interactions_update" on public.universal_interactions for update to public
  using (auth.uid() = actor_id)
  with check (auth.uid() = actor_id);
drop policy if exists "universal profiles owner write" on public.universal_profiles;
create policy "universal profiles owner write" on public.universal_profiles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "universal profiles public read" on public.universal_profiles;
create policy "universal profiles public read" on public.universal_profiles for select to authenticated
  using (true);
drop policy if exists "Public profiles are readable" on public.user_public_profiles;
create policy "Public profiles are readable" on public.user_public_profiles for select to anon,authenticated
  using (true);
drop policy if exists "Users can insert their own row" on public.users;
create policy "Users can insert their own row" on public.users for insert to authenticated
  with check (( SELECT auth.uid() AS uid) = id);
drop policy if exists "Users can update their own row" on public.users;
create policy "Users can update their own row" on public.users for update to authenticated
  using (( SELECT auth.uid() AS uid) = id)
  with check (( SELECT auth.uid() AS uid) = id);
drop policy if exists "Users can view their own row" on public.users;
create policy "Users can view their own row" on public.users for select to authenticated
  using (( SELECT auth.uid() AS uid) = id);
drop policy if exists "Users can view their own balance" on public.wallet_balances;
create policy "Users can view their own balance" on public.wallet_balances for select to authenticated
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "Users can view their own transactions" on public.wallet_transactions;
create policy "Users can view their own transactions" on public.wallet_transactions for select to authenticated
  using (( SELECT auth.uid() AS uid) = user_id);
drop policy if exists "own wallet" on public.wallets;
create policy "own wallet" on public.wallets for select to authenticated
  using (( SELECT auth.uid() AS uid) = user_id);

-- @views (all security_invoker = true, in dependency order)
create or replace view public.treasury_account_balances with (security_invoker = true) as
 SELECT a.id AS account_id,
    a.owner_id,
    a.scope,
    a.kind,
    a.asset_code,
    a.asset_kind,
    COALESCE(sum(
        CASE
            WHEN (a.kind = ANY (ARRAY['asset'::ledger_account_kind, 'expense'::ledger_account_kind])) AND e.direction = 'debit'::text THEN e.amount_minor
            WHEN (a.kind = ANY (ARRAY['asset'::ledger_account_kind, 'expense'::ledger_account_kind])) AND e.direction = 'credit'::text THEN - e.amount_minor
            WHEN (a.kind = ANY (ARRAY['liability'::ledger_account_kind, 'revenue'::ledger_account_kind, 'equity'::ledger_account_kind])) AND e.direction = 'credit'::text THEN e.amount_minor
            WHEN (a.kind = ANY (ARRAY['liability'::ledger_account_kind, 'revenue'::ledger_account_kind, 'equity'::ledger_account_kind])) AND e.direction = 'debit'::text THEN - e.amount_minor
            ELSE 0::bigint
        END), 0::numeric)::bigint AS balance_minor
   FROM treasury_accounts a
     LEFT JOIN treasury_entries e ON e.account_id = a.id
  WHERE a.active
  GROUP BY a.id, a.owner_id, a.scope, a.kind, a.asset_code, a.asset_kind;

create or replace view public.my_treasury_balances with (security_invoker = true) as
 SELECT account_id,
    asset_code,
    asset_kind,
    balance_minor
   FROM treasury_account_balances
  WHERE scope = 'user'::treasury_scope AND owner_id = auth.uid();

create or replace view public.treasury_my_balances with (security_invoker = true) as
 SELECT b.account_id,
    b.asset_code,
    b.asset_kind,
    a.display_name,
    b.balance_minor
   FROM treasury_account_balances b
     JOIN treasury_accounts a ON a.id = b.account_id
  WHERE b.scope = 'user'::treasury_scope AND b.owner_id = auth.uid() AND a.active;

create or replace view public.treasury_my_transactions with (security_invoker = true) as
 SELECT t.id AS transaction_id,
    t.reference,
    t.description,
    t.created_at,
    e.account_id,
    e.direction,
    e.amount_minor,
    a.asset_code,
    a.asset_kind
   FROM treasury_transactions t
     JOIN treasury_entries e ON e.transaction_id = t.id
     JOIN treasury_accounts a ON a.id = e.account_id
  WHERE a.scope = 'user'::treasury_scope AND a.owner_id = auth.uid()
  ORDER BY t.created_at DESC;

create or replace view public.short_gift_totals with (security_invoker = true) as
 SELECT short_id,
    count(*) AS gift_count,
    COALESCE(sum(amount_minor), 0::numeric)::bigint AS total_minor
   FROM short_gifts
  GROUP BY short_id;

create or replace view public.short_reaction_breakdown with (security_invoker = true) as
 SELECT short_id,
    reaction_type,
    count(*) AS count
   FROM short_likes
  GROUP BY short_id, reaction_type;

create or replace view public.short_recent_activity with (security_invoker = true) as
 SELECT short_id,
    count(*) AS recent_count
   FROM ( SELECT short_likes.short_id,
            short_likes.created_at
           FROM short_likes
        UNION ALL
         SELECT short_comments.short_id,
            short_comments.created_at
           FROM short_comments
        UNION ALL
         SELECT short_reposts.short_id,
            short_reposts.created_at
           FROM short_reposts) combined
  WHERE created_at > (now() - '01:00:00'::interval)
  GROUP BY short_id;

create or replace view public.user_content_analytics with (security_invoker = true) as
 SELECT u.id AS user_id,
    COALESCE(s.short_count, 0::bigint) AS short_count,
    COALESCE(s.short_views, 0::bigint) AS short_views,
    COALESCE(s.short_likes, 0::bigint) AS short_likes,
    COALESCE(s.short_reposts, 0::bigint) AS short_reposts,
    COALESCE(p.post_count, 0::bigint) AS post_count,
    COALESCE(p.post_likes, 0::bigint) AS post_likes,
    COALESCE(g.gifts_received_count, 0::bigint) AS gifts_received_count,
    COALESCE(g.gifts_received_minor, 0::numeric)::bigint AS gifts_received_minor,
    COALESCE(fol.follower_count, 0::bigint) AS follower_count,
    COALESCE(fing.following_count, 0::bigint) AS following_count
   FROM users u
     LEFT JOIN ( SELECT shorts.author_id,
            count(*) AS short_count,
            sum(shorts.view_count) AS short_views,
            sum(shorts.like_count) AS short_likes,
            sum(shorts.repost_count) AS short_reposts
           FROM shorts
          GROUP BY shorts.author_id) s ON s.author_id = u.id
     LEFT JOIN ( SELECT posts.author_id,
            count(*) AS post_count,
            sum(posts.like_count) AS post_likes
           FROM posts
          GROUP BY posts.author_id) p ON p.author_id = u.id
     LEFT JOIN ( SELECT short_gifts.recipient_id,
            count(*) AS gifts_received_count,
            sum(short_gifts.amount_minor) AS gifts_received_minor
           FROM short_gifts
          GROUP BY short_gifts.recipient_id) g ON g.recipient_id = u.id
     LEFT JOIN ( SELECT follows.followed_id,
            count(*) AS follower_count
           FROM follows
          GROUP BY follows.followed_id) fol ON fol.followed_id = u.id
     LEFT JOIN ( SELECT follows.follower_id,
            count(*) AS following_count
           FROM follows
          GROUP BY follows.follower_id) fing ON fing.follower_id = u.id;

create or replace view public.user_reputation with (security_invoker = true) as
 SELECT user_id,
    (floor(short_views::numeric / 100.0) + ((short_likes + short_reposts * 2 + post_likes) * 2)::numeric + (gifts_received_count * 10)::numeric + (follower_count * 5)::numeric)::integer AS reputation_score
   FROM user_content_analytics;

create or replace view public.universal_profile_stats with (security_invoker = true) as
 SELECT u.id AS user_id,
    u.username,
    u.full_name,
    COALESCE(shorts_agg.short_count, 0::bigint) AS short_count,
    COALESCE(posts_agg.post_count, 0::bigint) AS post_count,
    COALESCE(shorts_agg.short_likes, 0::bigint) + COALESCE(posts_agg.post_likes, 0::bigint) AS total_likes_received,
    COALESCE(shorts_agg.short_comments, 0::bigint) + COALESCE(posts_agg.post_comments, 0::bigint) AS total_comments_received,
    COALESCE(shorts_agg.short_reposts, 0::bigint) AS total_reposts_received,
    COALESCE(gifts_agg.gift_count, 0::bigint) AS gifts_received_count,
    COALESCE(gifts_agg.gift_total_minor, 0::numeric) AS gifts_received_total_minor,
    COALESCE(followers_agg.follower_count, 0::bigint) AS follower_count,
    COALESCE(following_agg.following_count, 0::bigint) AS following_count,
    (COALESCE(shorts_agg.short_count, 0::bigint) + COALESCE(posts_agg.post_count, 0::bigint)) * 2 + COALESCE(shorts_agg.short_likes, 0::bigint) + COALESCE(posts_agg.post_likes, 0::bigint) + (COALESCE(shorts_agg.short_comments, 0::bigint) + COALESCE(posts_agg.post_comments, 0::bigint)) * 2 + COALESCE(shorts_agg.short_reposts, 0::bigint) * 3 + COALESCE(gifts_agg.gift_count, 0::bigint) * 5 + COALESCE(followers_agg.follower_count, 0::bigint) AS reputation_score
   FROM users u
     LEFT JOIN ( SELECT shorts.author_id,
            count(*) AS short_count,
            sum(shorts.like_count) AS short_likes,
            sum(shorts.comment_count) AS short_comments,
            sum(shorts.repost_count) AS short_reposts
           FROM shorts
          GROUP BY shorts.author_id) shorts_agg ON shorts_agg.author_id = u.id
     LEFT JOIN ( SELECT posts.author_id,
            count(*) AS post_count,
            sum(posts.like_count) AS post_likes,
            sum(posts.comment_count) AS post_comments
           FROM posts
          GROUP BY posts.author_id) posts_agg ON posts_agg.author_id = u.id
     LEFT JOIN ( SELECT short_gifts.recipient_id,
            count(*) AS gift_count,
            sum(short_gifts.amount_minor) AS gift_total_minor
           FROM short_gifts
          GROUP BY short_gifts.recipient_id) gifts_agg ON gifts_agg.recipient_id = u.id
     LEFT JOIN ( SELECT follows.followed_id,
            count(*) AS follower_count
           FROM follows
          GROUP BY follows.followed_id) followers_agg ON followers_agg.followed_id = u.id
     LEFT JOIN ( SELECT follows.follower_id,
            count(*) AS following_count
           FROM follows
          GROUP BY follows.follower_id) following_agg ON following_agg.follower_id = u.id;

-- @triggers

drop trigger if exists on_note_vote_change on public.community_note_votes;
create trigger on_note_vote_change AFTER INSERT OR DELETE ON public.community_note_votes FOR EACH ROW EXECUTE FUNCTION public.update_note_vote_counts();
drop trigger if exists connection_requests_touch on public.connection_requests;
create trigger connection_requests_touch BEFORE UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.touch_connection_request();
drop trigger if exists creator_draft_touch on public.creator_drafts;
create trigger creator_draft_touch BEFORE UPDATE ON public.creator_drafts FOR EACH ROW EXECUTE FUNCTION public.touch_creator_draft();
drop trigger if exists touch_fresh_ai_mission on public.fresh_ai_missions;
create trigger touch_fresh_ai_mission BEFORE UPDATE ON public.fresh_ai_missions FOR EACH ROW EXECUTE FUNCTION public.touch_fresh_ai_mission();
drop trigger if exists fresh_id_private_profile_audit_guard on public.fresh_id_private_profiles;
create trigger fresh_id_private_profile_audit_guard BEFORE INSERT OR UPDATE ON public.fresh_id_private_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_fresh_id_private_profile_audit();
drop trigger if exists ledger_entries_immutable on public.ledger_entries;
create trigger ledger_entries_immutable BEFORE DELETE OR UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();
drop trigger if exists ledger_transactions_immutable on public.ledger_transactions;
create trigger ledger_transactions_immutable BEFORE DELETE OR UPDATE ON public.ledger_transactions FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();
drop trigger if exists on_post_comment_change on public.post_comments;
create trigger on_post_comment_change AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();
drop trigger if exists on_post_like_change on public.post_likes;
create trigger on_post_like_change AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();
drop trigger if exists profile_details_touch on public.profile_details;
create trigger profile_details_touch BEFORE UPDATE ON public.profile_details FOR EACH ROW EXECUTE FUNCTION public.touch_profile_details();
drop trigger if exists profile_portfolio_touch on public.profile_portfolio_items;
create trigger profile_portfolio_touch BEFORE UPDATE ON public.profile_portfolio_items FOR EACH ROW EXECUTE FUNCTION public.touch_profile_details();
drop trigger if exists profile_projects_touch on public.profile_projects;
create trigger profile_projects_touch BEFORE UPDATE ON public.profile_projects FOR EACH ROW EXECUTE FUNCTION public.touch_profile_details();
drop trigger if exists on_short_comment_change on public.short_comments;
create trigger on_short_comment_change AFTER INSERT OR DELETE ON public.short_comments FOR EACH ROW EXECUTE FUNCTION public.update_short_comment_count();
drop trigger if exists on_short_like_change on public.short_likes;
create trigger on_short_like_change AFTER INSERT OR DELETE ON public.short_likes FOR EACH ROW EXECUTE FUNCTION public.update_short_like_count();
drop trigger if exists on_short_repost_change on public.short_reposts;
create trigger on_short_repost_change AFTER INSERT OR DELETE ON public.short_reposts FOR EACH ROW EXECUTE FUNCTION public.update_short_repost_count();
drop trigger if exists universal_interactions_set_updated_at on public.universal_interactions;
create trigger universal_interactions_set_updated_at BEFORE UPDATE ON public.universal_interactions FOR EACH ROW EXECUTE FUNCTION public.set_universal_interaction_updated_at();
drop trigger if exists universal_interactions_sync_short_legacy on public.universal_interactions;
create trigger universal_interactions_sync_short_legacy AFTER INSERT OR DELETE OR UPDATE ON public.universal_interactions FOR EACH ROW EXECUTE FUNCTION public.sync_universal_interaction_to_short_legacy();
drop trigger if exists protect_users_privileged_columns on public.users;
create trigger protect_users_privileged_columns BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.protect_users_privileged_columns();
drop trigger if exists sync_user_public_profile on public.users;
create trigger sync_user_public_profile AFTER INSERT OR UPDATE OF username, full_name, verified, presence ON public.users FOR EACH ROW EXECUTE FUNCTION public.sync_user_public_profile();
drop trigger if exists users_ensure_profile_details on public.users;
create trigger users_ensure_profile_details AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_details_for_user();

-- @grants
-- Supabase's default privileges grant ALL on new public objects to anon, authenticated and service_role.
-- Production deviates from that default on the objects below; this block reproduces those deviations only.
-- Table/view privileges are applied only when the object exists, and each statement is idempotent.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      -- table, role, privileges to keep ('' = none)
      ('connection_requests','anon',''),
      ('connection_requests','authenticated','select'),
      ('direct_messages','anon',''),
      ('direct_messages','authenticated','select'),
      ('ecosystem_profiles','anon','select'),
      ('ecosystem_profiles','authenticated','insert,select,update'),
      ('fresh_ai_feedback','anon',''),
      ('fresh_ai_missions','anon',''),
      ('fresh_ai_safety_events','anon',''),
      ('fresh_ai_safety_events','authenticated',''),
      ('fresh_ai_serving_metrics','anon',''),
      ('fresh_ai_serving_metrics','authenticated',''),
      ('fresh_ai_training_examples','anon',''),
      ('fresh_ai_training_examples','authenticated',''),
      ('fresh_communication_messages','anon',''),
      ('fresh_communication_messages','authenticated','select'),
      ('fresh_communication_threads','anon',''),
      ('fresh_communication_threads','authenticated','select'),
      ('fresh_id_account_memberships','anon',''),
      ('fresh_id_account_memberships','authenticated','select'),
      ('fresh_id_accounts','anon',''),
      ('fresh_id_accounts','authenticated','select'),
      ('fresh_id_devices','anon',''),
      ('fresh_id_devices','authenticated','insert,select,update'),
      ('fresh_id_private_profiles','anon',''),
      ('fresh_id_private_profiles','authenticated','insert,select'),
      ('fresh_intelligence_evidence_lineage','anon',''),
      ('fresh_intelligence_evidence_lineage','authenticated',''),
      ('fresh_intelligence_persistence_batches','anon',''),
      ('fresh_intelligence_persistence_batches','authenticated',''),
      ('fresh_intelligence_truth_decisions','anon',''),
      ('fresh_intelligence_truth_decisions','authenticated',''),
      ('fresh_knowledge_entity_aliases','anon',''),
      ('fresh_knowledge_entity_aliases','authenticated',''),
      ('fresh_knowledge_entity_relations','anon',''),
      ('fresh_knowledge_entity_relations','authenticated',''),
      ('ledger_entries','anon',''),
      ('ledger_entries','authenticated',''),
      ('ledger_transactions','anon',''),
      ('ledger_transactions','authenticated',''),
      ('marketplace_purchases','anon','references,select,trigger,truncate'),
      ('marketplace_purchases','authenticated','references,select,trigger,truncate'),
      ('short_captions','authenticated','insert,references,select,trigger,truncate,update'),
      ('short_gifts','authenticated','insert,references,select,trigger,truncate'),
      ('treasury_accounts','authenticated','references,select,trigger,truncate'),
      ('treasury_entries','authenticated','select'),
      ('treasury_rail_requests','authenticated','insert,references,select,trigger,truncate'),
      ('treasury_transactions','authenticated','select'),
      ('user_public_profiles','anon','references,select,trigger,truncate'),
      ('user_public_profiles','authenticated','references,select,trigger,truncate'),
      ('users','anon',''),
      ('users','authenticated','select')
    ) as v(tbl, grantee, keep)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then
      continue;
    end if;
    execute format('revoke all on table public.%I from %I', r.tbl, r.grantee);
    if r.keep <> '' then
      execute format('grant %s on table public.%I to %I', r.keep, r.tbl, r.grantee);
    end if;
  end loop;
end
$$;

-- Column-level privileges (production pg_attribute.attacl): writes are limited to specific columns.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('users', 'insert', 'id,email,username,full_name,preferences'),
      ('users', 'update', 'username,full_name,identity,preferences,updated_at'),
      ('connection_requests', 'insert', 'status,requester_id,recipient_id'),
      ('connection_requests', 'update', 'status'),
      ('direct_messages', 'insert', 'body,sender_id,recipient_id'),
      ('direct_messages', 'update', 'read_at'),
      ('fresh_communication_threads', 'insert', 'kind,owner_id,title'),
      ('fresh_communication_threads', 'update', 'title'),
      ('fresh_communication_messages', 'insert', 'thread_id,sender_id,kind,body'),
      ('fresh_id_private_profiles', 'update', 'country,gender,updated_at')
    ) as v(tbl, priv, cols)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then
      continue;
    end if;
    execute format('grant %s (%s) on table public.%I to authenticated', r.priv,
      (select string_agg(quote_ident(c), ', ') from unnest(string_to_array(r.cols, ',')) c), r.tbl);
  end loop;
end
$$;
