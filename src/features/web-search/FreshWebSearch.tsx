import { useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import FreshWebSearchView from "./FreshWebSearchView";
import { searchFreshWeb } from "./webSearchClient";

export default function FreshWebSearch() {
  const { isAuthenticated } = useFreshId();
  const search = useCallback(
    (query: string, signal: AbortSignal) =>
      searchFreshWeb(query, { signal, getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null }),
    [],
  );
  return <FreshWebSearchView signedIn={isAuthenticated} search={search} />;
}
