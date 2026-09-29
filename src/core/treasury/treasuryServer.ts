import { supabase } from "../../lib/supabase";

export async function callTreasuryServer<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("You must be signed in.");

  const response = await fetch("/api/finance/treasury", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) throw new Error(body.error ?? "Treasury server request failed");
  return body.data as T;
}
