import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mission, MissionStatus } from "./mission";

// Persistent, Supabase-backed companion to the in-memory MissionManager.
// Pass a client that carries the signed-in user's session so RLS applies.

type MissionRow = {
  id: string;
  title: string;
  description: string;
  goal: string;
  status: MissionStatus;
  objectives: unknown;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id,title,description,goal,status,objectives,created_at,updated_at";

function toMission(row: MissionRow): Mission {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    goal: row.goal,
    status: row.status,
    objectives: Array.isArray(row.objectives)
      ? row.objectives.filter((x): x is string => typeof x === "string")
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NewMission = {
  title: string;
  description?: string;
  goal?: string;
  objectives?: string[];
  status?: MissionStatus;
  ecosystem?: string;
  power?: string;
};

export function createMissionStore(client: SupabaseClient, userId: string) {
  return {
    async create(input: NewMission): Promise<Mission> {
      const { data, error } = await client
        .from("fresh_ai_missions")
        .insert({
          user_id: userId,
          title: input.title,
          description: input.description ?? "",
          goal: input.goal ?? "",
          objectives: input.objectives ?? [],
          status: input.status ?? "planned",
          ecosystem: input.ecosystem ?? null,
          power: input.power ?? null,
        })
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Mission was not created");
      return toMission(data as MissionRow);
    },

    async list(status?: MissionStatus): Promise<Mission[]> {
      let query = client.from("fresh_ai_missions").select(COLUMNS).order("updated_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as MissionRow[]).map(toMission);
    },

    async get(id: string): Promise<Mission | null> {
      const { data, error } = await client.from("fresh_ai_missions").select(COLUMNS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? toMission(data as MissionRow) : null;
    },

    async updateStatus(id: string, status: MissionStatus): Promise<Mission | null> {
      const { data, error } = await client
        .from("fresh_ai_missions")
        .update({ status })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw error;
      return data ? toMission(data as MissionRow) : null;
    },
  };
}
