import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

type AdminRequest = {
  action?: "list" | "update";
  userId?: string;
  fullName?: string;
  username?: string;
  role?: string;
};

function response(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function clients() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error("Supabase admin environment is not configured");
  return {
    auth: createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return response({ error: "Authentication required" }, 401);

    const body = (await req.json()) as AdminRequest;
    const { auth, admin } = clients();
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return response({ error: "Invalid authentication session" }, 401);

    const { data: actor, error: actorError } = await admin
      .from("users")
      .select("id, role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (actorError) return response({ error: actorError.message }, 500);
    if (!actor || actor.role !== "admin") return response({ error: "Administrator access required" }, 403);

    if (body.action === "list") {
      const { data, error } = await admin
        .from("users")
        .select("id, full_name, username, email, role, verified, presence, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return response({ error: error.message }, 500);
      return response({ users: data ?? [] });
    }

    if (body.action === "update") {
      if (!body.userId) return response({ error: "userId is required" }, 400);
      if (body.userId === authData.user.id && body.role && body.role !== "admin") {
        return response({ error: "An administrator cannot remove their own administrator role from this panel" }, 400);
      }

      const patch: Record<string, string> = {};
      if (typeof body.fullName === "string" && body.fullName.trim()) patch.full_name = body.fullName.trim();
      if (typeof body.username === "string" && body.username.trim()) patch.username = body.username.trim().toLowerCase();
      if (typeof body.role === "string" && ["user", "creator", "developer", "business", "admin"].includes(body.role)) patch.role = body.role;
      if (!Object.keys(patch).length) return response({ error: "No supported fields supplied" }, 400);

      const { data, error } = await admin.from("users").update(patch).eq("id", body.userId).select("id, full_name, username, email, role, verified, presence, created_at").maybeSingle();
      if (error) return response({ error: error.message }, 400);
      return response({ user: data });
    }

    return response({ error: "Unsupported admin action" }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Admin operation failed" }, 500);
  }
}
