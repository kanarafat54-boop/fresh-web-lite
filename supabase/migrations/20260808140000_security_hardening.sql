-- Keep the repository migration history aligned with the production hardening
-- applied to the Fresh Web Lite Supabase project.

do $view$
declare
  view_name text;
begin
  foreach view_name in array array[
    'public.treasury_account_balances',
    'public.my_treasury_balances',
    'public.short_reaction_breakdown',
    'public.short_recent_activity'
  ] loop
    if to_regclass(view_name) is not null then
      execute format('alter view %s set (security_invoker = true)', view_name);
    end if;
  end loop;
end;
$view$;
-- Client roles must never be able to call privileged ledger mutation or
-- administrative helper functions directly.
do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.assert_ledger_transaction_balanced(uuid)',
    'public.create_treasury_transaction(text, text, jsonb, jsonb)',
    'public.send_tip(uuid, uuid, integer, text)',
    'public.rls_auto_enable()',
    'public.increment_short_views(uuid)',
    'public.update_note_vote_counts()',
    'public.update_post_comment_count()',
    'public.update_post_like_count()',
    'public.update_short_comment_count()',
    'public.update_short_like_count()',
    'public.update_short_repost_count()',
    'public.reject_ledger_mutation()'
  ] loop
    if to_regprocedure(function_signature) is not null then
      execute 'revoke execute on function ' || function_signature || ' from public, anon, authenticated';
    end if;
  end loop;
end;
$$;

-- Pin mutable function resolution to the trusted schema.
do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.update_post_like_count()',
    'public.update_short_repost_count()',
    'public.update_short_like_count()',
    'public.update_note_vote_counts()',
    'public.update_post_comment_count()',
    'public.update_short_comment_count()',
    'public.increment_short_views(uuid)',
    'public.send_tip(uuid, uuid, integer, text)',
    'public.reject_ledger_mutation()'
  ] loop
    if to_regprocedure(function_signature) is not null then
      execute 'alter function ' || function_signature || ' set search_path = public';
    end if;
  end loop;
end;
$$;

-- Ledger base tables remain RLS-protected without client policies: all
-- mutation access is intentionally routed through controlled server functions.
