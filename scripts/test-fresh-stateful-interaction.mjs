// Verifies the state-interaction write: read, then update or insert, never an ON CONFLICT upsert, never writes state_key.
import assert from "node:assert/strict";
import { writeStatefulInteraction } from "../src/core/interactions/statefulInteractionWrite.ts";

function fakeClient({ existing = null, insertError = null, readError = null } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      assert.equal(table, "universal_interactions");
      const filters = {};
      const builder = {
        select: () => { calls.push("select"); return builder; },
        eq: (c, v) => { filters[c] = v; return builder; },
        limit: () => builder,
        maybeSingle: async () => ({ data: readError ? null : existing, error: readError }),
        update: (changes) => { calls.push({ update: changes }); return builder; },
        insert: async (row) => { calls.push({ insert: row }); return { error: insertError }; },
        then: (resolve) => resolve({ error: null, filters }),
      };
      return builder;
    },
  };
  return client;
}

const base = { actor_id: "a", target_type: "short", target_id: "s", interaction_type: "react", interaction_value: "love", payload: {} };

{ // no row yet -> insert, without state_key
  const c = fakeClient();
  const r = await writeStatefulInteraction(c, { ...base, state_key: "react" });
  assert.equal(r.error, null);
  const ins = c.calls.find((x) => x.insert);
  assert.ok(ins, "inserted");
  assert.ok(!("state_key" in ins.insert), "state_key is never written");
  assert.equal(ins.insert.interaction_value, "love");
}
{ // row exists -> update only the changeable columns
  const c = fakeClient({ existing: { id: "1" } });
  await writeStatefulInteraction(c, base);
  assert.ok(!c.calls.some((x) => x.insert), "no insert");
  const up = c.calls.find((x) => x.update);
  assert.deepEqual(Object.keys(up.update).sort(), ["interaction_value", "payload"]);
}
{ // lost a race (unique violation) -> becomes an update
  const c = fakeClient({ insertError: { code: "23505", message: "dup" } });
  const r = await writeStatefulInteraction(c, base);
  assert.equal(r.error, null);
  assert.ok(c.calls.some((x) => x.update), "falls back to update");
}
{ // other insert errors are reported
  const c = fakeClient({ insertError: { code: "42501", message: "rls" } });
  const r = await writeStatefulInteraction(c, base);
  assert.equal(r.error.message, "rls");
}
{ // read errors are reported and nothing is written
  const c = fakeClient({ readError: { message: "boom" } });
  const r = await writeStatefulInteraction(c, base);
  assert.equal(r.error.message, "boom");
  assert.ok(!c.calls.some((x) => x.insert || x.update));
}
console.log("stateful interaction write: ok");
