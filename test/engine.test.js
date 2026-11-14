import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReply } from "../src/worker.js";

const hotline = "0800-TEST";

test("never asks for PIN/OTP: security message gives safety guidance and a reference", () => {
  const r = buildReply({ message: "someone asked for my OTP", lang: "en", hotline });
  assert.equal(r.intent, "security");
  assert.match(r.reply, /do not share your PIN, password or OTP/i);
  assert.ok(r.reference);
});

test("failed transfer escalates with reference", () => {
  const r = buildReply({ message: "I sent money but the person has not received it", lang: "en", hotline });
  assert.equal(r.intent, "transfer");
  assert.ok(r.reference);
});

test("transfer status question gives guidance without escalation", () => {
  const r = buildReply({ message: "my transfer is pending", lang: "en", hotline });
  assert.equal(r.intent, "transfer");
  assert.equal(r.reference, null);
});

test("pidgin is detected automatically", () => {
  const r = buildReply({ message: "abeg my card don lost", lang: "auto", hotline });
  assert.equal(r.language, "pcm");
  assert.equal(r.intent, "card");
});

test("hotline is included in card replies", () => {
  const r = buildReply({ message: "I lost my card", lang: "en", hotline });
  assert.ok(r.reply.includes(hotline));
});

test("unknown input gets a clarifying reply", () => {
  const r = buildReply({ message: "xyzzy", lang: "en", hotline });
  assert.equal(r.intent, "unknown");
});
