import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FreshLearningObjective,
  FreshLearningObjectiveRepository,
} from "../core/fresh-ai/FreshAutonomousLearningCore.js";

type ObjectiveRow = {
  id: string;
  user_id: string;
  title: string;
  skill: string;
  source_event_ids: string[];
  due_at: string;
  status: FreshLearningObjective["status"];
  attempts: number;
  lease_token: string;
};

export function createSupabaseFreshLearningObjectiveRepository(
  client: SupabaseClient,
): FreshLearningObjectiveRepository {
  return {
    async claimDue(now, limit) {
      const claimed = await client.rpc("fresh_ai_claim_learning_objectives", {
        p_now: now,
        p_limit: Math.max(1, Math.min(25, Math.trunc(limit))),
        p_lease_seconds: 300,
      });
      if (claimed.error) throw new Error("Unable to claim Fresh AI learning objectives.");
      return ((claimed.data ?? []) as ObjectiveRow[]).map((row) => ({
        id: row.id,
        ownerId: row.user_id,
        title: row.title,
        skill: row.skill,
        sourceEventIds: row.source_event_ids ?? [],
        dueAt: row.due_at,
        status: row.status,
        attempts: row.attempts,
        leaseToken: row.lease_token,
      }));
    },

    async complete(objectiveId, leaseToken, resultReference) {
      const result = await client.rpc("fresh_ai_complete_learning_objective", {
        p_objective_id: objectiveId,
        p_lease_token: leaseToken,
        p_result_reference: resultReference,
      });
      if (result.error || result.data !== true) {
        throw new Error("Fresh AI learning objective lease was lost before completion.");
      }
    },

    async fail(objectiveId, leaseToken, reasonCode) {
      const result = await client.rpc("fresh_ai_fail_learning_objective", {
        p_objective_id: objectiveId,
        p_lease_token: leaseToken,
        p_reason_code: reasonCode,
      });
      if (result.error || result.data !== true) {
        throw new Error("Fresh AI learning objective lease was lost before failure handling.");
      }
    },
  };
}

export type FreshLearningObjectiveProcessor = (
  objective: FreshLearningObjective,
) => Promise<{ resultReference: string }>;

export type FreshLearningWorkerResult = {
  claimed: number;
  completed: number;
  failed: number;
};

/**
 * Executes only work explicitly claimed by the service-role lease RPC.
 * The processor is injected so the scheduler cannot pretend that practice
 * or model training happened when no validated execution engine is installed.
 */
export async function runFreshLearningWorker(input: {
  repository: FreshLearningObjectiveRepository;
  processor: FreshLearningObjectiveProcessor;
  now?: Date;
  limit?: number;
}): Promise<FreshLearningWorkerResult> {
  const now = input.now ?? new Date();
  const objectives = await input.repository.claimDue(
    now.toISOString(),
    Math.max(1, Math.min(25, Math.trunc(input.limit ?? 5))),
  );
  const result: FreshLearningWorkerResult = { claimed: objectives.length, completed: 0, failed: 0 };

  for (const objective of objectives) {
    if (!objective.leaseToken) {
      result.failed += 1;
      continue;
    }
    try {
      const output = await input.processor(objective);
      if (!output || typeof output.resultReference !== "string" || !output.resultReference.trim()) {
        throw new Error("invalid_processor_result");
      }
      await input.repository.complete(objective.id, objective.leaseToken, output.resultReference);
      result.completed += 1;
    } catch {
      try {
        await input.repository.fail(objective.id, objective.leaseToken, "processor_failed");
      } catch {
        // Lease expiry permits a later worker to reclaim the task safely.
      }
      result.failed += 1;
    }
  }
  return result;
}
