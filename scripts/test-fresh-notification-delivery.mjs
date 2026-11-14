import assert from "node:assert/strict";
import { newItems, buildDelivery, deliveryStatus, readEnabled, readLastCheck, DEVICE_NOTIFY_KEY } from "../src/features/fresh-flow/core/notificationDelivery.ts";
import { EMPTY_STATE } from "../src/features/fresh-flow/core/notificationState.ts";
import { DEFAULT_PRIVACY } from "../src/features/fresh-flow/core/shortsPrivacy.ts";

const item = (id, at, kind = "reaction", over = {}) => ({ id, kind, at, actorId: "a", actorName: "Sam", text: `Sam liked ${id}`, unread: true, ...over });
const t = (s) => Date.parse(s);
const items = [item("new1", "2026-11-12T10:05:00Z"), item("old", "2026-11-12T09:00:00Z"), item("cmt", "2026-11-12T10:06:00Z", "comment", { detail: "nice one", shortId: "s1" })];

assert.deepEqual(newItems(items, EMPTY_STATE, t("2026-11-12T10:00:00Z")).map((i) => i.id).sort(), ["cmt", "new1"], "only items after the last check");
assert.equal(newItems(items, { ...EMPTY_STATE, disabledCategories: ["reactions"] }, 0).some((i) => i.kind === "like"), false, "disabled categories are not delivered");
assert.equal(newItems(items, { ...EMPTY_STATE, readIds: ["new1"] }, 0).some((i) => i.id === "new1"), false, "read items are not delivered");
assert.equal(newItems([], EMPTY_STATE, 0).length, 0);

const noon = new Date(2026, 10, 12, 12, 0);
const one = buildDelivery([items[2]], DEFAULT_PRIVACY, noon);
assert.equal(one.body, "Sam liked cmt: nice one");
assert.equal(one.shortId, "s1");
const many = buildDelivery([items[0], items[2]], DEFAULT_PRIVACY, noon);
assert.match(many.body, /^2 new notifications, latest: /);
assert.equal(many.shortId, undefined);
assert.equal(buildDelivery([], DEFAULT_PRIVACY, noon), null);
const quiet = { ...DEFAULT_PRIVACY, quietEnabled: true, quietFrom: "22:00", quietUntil: "07:00" };
assert.equal(buildDelivery([items[0]], quiet, new Date(2026, 10, 12, 23, 30)), null, "nothing during quiet hours");
assert.ok(buildDelivery([items[0]], quiet, noon));
assert.ok(buildDelivery([{ ...items[0], detail: "x".repeat(500) }], DEFAULT_PRIVACY, noon).body.length <= 160);

assert.equal(deliveryStatus("unsupported", false).canEnable, false);
assert.equal(deliveryStatus("denied", true).canEnable, false);
assert.equal(deliveryStatus("default", false).canEnable, true);
assert.equal(deliveryStatus("granted", false).canEnable, true);
assert.equal(deliveryStatus("granted", true).canDisable, true);
assert.match(deliveryStatus("granted", true).label, /Not shown after you close/);

const store = (v) => ({ getItem: () => v });
assert.equal(readEnabled(store("1")), true);
assert.equal(readEnabled(store(null)), false);
assert.equal(readEnabled(null), false);
assert.equal(readEnabled({ getItem() { throw new Error("blocked"); } }), false);
assert.equal(readLastCheck(store("123"), 9), 123);
assert.equal(readLastCheck(store("abc"), 9), 9);
assert.equal(DEVICE_NOTIFY_KEY, "fresh-shorts-device-notify");
console.log("notification delivery: ok");
