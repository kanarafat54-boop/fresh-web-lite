import assert from "node:assert/strict";
import {
  DEFAULT_PRIVACY, parseKeywords, normalizeTime, normalizeLimit, settingsFromRow, settingsToRow, isQuietNow, breakDue, dayKey,
  explainControlError, isPrivacyUnavailable, heldCommentView, isCommentHiddenState, MAX_KEYWORDS, MAX_KEYWORD_LENGTH,
} from "../src/features/fresh-flow/core/shortsPrivacy.ts";

// keywords
assert.deepEqual(parseKeywords("spam, Buy now ,, SPAM\nfree money"), ["spam", "Buy now", "free money"]);
assert.equal(parseKeywords("x".repeat(100))[0].length, MAX_KEYWORD_LENGTH);
assert.equal(parseKeywords(Array.from({ length: 80 }, (_, i) => `k${i}`).join(",")).length, MAX_KEYWORDS);
assert.deepEqual(parseKeywords("  ,  , "), []);

// time and limit
assert.equal(normalizeTime("7:05"), "07:05");
assert.equal(normalizeTime("22:00:00"), "22:00");
assert.equal(normalizeTime("24:00"), null);
assert.equal(normalizeTime("12:60"), null);
assert.equal(normalizeTime(null), null);
assert.equal(normalizeLimit("30"), 30);
assert.equal(normalizeLimit(4), null);
assert.equal(normalizeLimit(721), null);
assert.equal(normalizeLimit(""), null);
assert.equal(normalizeLimit("abc"), null);

// row round trip, bad values fall back to defaults
assert.deepEqual(settingsFromRow(null), DEFAULT_PRIVACY);
const bad = settingsFromRow({ who_can_comment: "admins", who_can_message: 5, comment_keywords: ["a", 3, "a", "B"], quiet_from: "99:99", daily_limit_minutes: 2 });
assert.equal(bad.whoCanComment, "everyone");
assert.equal(bad.whoCanMessage, "everyone");
assert.deepEqual(bad.commentKeywords, ["a", "B"]);
assert.equal(bad.quietFrom, null);
assert.equal(bad.dailyLimitMinutes, null);
const custom = { ...DEFAULT_PRIVACY, whoCanComment: "following", holdComments: true, commentKeywords: ["Spam", "spam", "x"], whoCanMessage: "nobody", soundReuseAllowed: false, quietEnabled: true, quietFrom: "22:00", quietUntil: "07:00", dailyLimitMinutes: 45 };
const row = settingsToRow("u1", custom);
assert.equal(row.user_id, "u1");
assert.deepEqual(row.comment_keywords, ["Spam", "x"]);
assert.deepEqual(settingsFromRow(row), { ...custom, commentKeywords: ["Spam", "x"] });

// quiet window, including across midnight
const at = (h, m) => new Date(2026, 10, 11, h, m);
const night = { ...DEFAULT_PRIVACY, quietEnabled: true, quietFrom: "22:00", quietUntil: "07:00" };
assert.equal(isQuietNow(night, at(23, 0)), true);
assert.equal(isQuietNow(night, at(3, 30)), true);
assert.equal(isQuietNow(night, at(7, 0)), false);
assert.equal(isQuietNow(night, at(12, 0)), false);
assert.equal(isQuietNow(night, at(22, 0)), true);
const day = { ...DEFAULT_PRIVACY, quietEnabled: true, quietFrom: "13:00", quietUntil: "14:00" };
assert.equal(isQuietNow(day, at(13, 30)), true);
assert.equal(isQuietNow(day, at(14, 0)), false);
assert.equal(isQuietNow({ ...night, quietEnabled: false }, at(23, 0)), false);
assert.equal(isQuietNow({ ...night, quietUntil: "22:00" }, at(22, 30)), false, "equal times mean no window");
assert.equal(isQuietNow({ ...night, quietFrom: null }, at(23, 0)), false);

// break decisions
const limited = { ...DEFAULT_PRIVACY, quietEnabled: true, dailyLimitMinutes: 30 };
assert.equal(breakDue(limited, 29, at(12, 0)), null);
assert.equal(breakDue(limited, 30, at(12, 0)), "daily-limit");
assert.equal(breakDue(limited, 35, at(12, 0), 10), null, "extra minutes after Continue");
assert.equal(breakDue(limited, 40, at(12, 0), 10), "daily-limit");
assert.equal(breakDue({ ...limited, quietEnabled: false }, 999, at(12, 0)), null, "off means off");
assert.equal(breakDue({ ...night, dailyLimitMinutes: 30 }, 0, at(23, 0)), "quiet-hours");
assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");

// error explanations
assert.match(explainControlError("Comments are turned off for this Short."), /turned comments off/);
assert.match(explainControlError("Only people the creator follows can comment on this Short."), /follows/);
assert.match(explainControlError("You can't comment on this Short."), /can't do that/);
assert.match(explainControlError("This account only accepts messages from people it follows."), /not accepting/);
assert.equal(explainControlError("network down"), null);
assert.equal(explainControlError(undefined), null);

// unavailable detection
assert.equal(isPrivacyUnavailable({ code: "42P01" }), true);
assert.equal(isPrivacyUnavailable({ code: "PGRST205" }), true);
assert.equal(isPrivacyUnavailable({ message: "relation short_privacy_settings does not exist" }), true);
assert.equal(isPrivacyUnavailable({ code: "42501", message: "denied" }), false);
assert.equal(isPrivacyUnavailable(null), false);

// held comments
assert.equal(heldCommentView("visible", "a", "b", "c"), null);
assert.deepEqual(heldCommentView("pending", "b", "b", "c"), { held: true, mine: true, isCreator: false });
assert.deepEqual(heldCommentView("pending", "c", "b", "c"), { held: true, mine: false, isCreator: true });
assert.deepEqual(heldCommentView("pending", null, "b", "c"), { held: true, mine: false, isCreator: false });
assert.equal(isCommentHiddenState("visible"), false);
assert.equal(isCommentHiddenState("approved"), false);
assert.equal(isCommentHiddenState("pending"), false);
assert.equal(isCommentHiddenState("removed"), true);
assert.equal(isCommentHiddenState("hidden"), true);
assert.equal(isCommentHiddenState(undefined), false);
console.log("shorts privacy: ok");
