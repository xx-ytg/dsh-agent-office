import test from "node:test";
import assert from "node:assert/strict";
import { OfficeStore } from "../src/store.mjs";
import { options, apply } from "../src/index.mjs";
const session = {
  id: "test-1",
  header: {
    cwd: "C:\\private\\project",
    origin: "subagent",
    parentSession: "parent",
  },
};
function fixture(config) {
  const store = new OfficeStore(config);
  let seq = 0;
  return {
    store,
    send: (type, data = {}) =>
      store.ingest(session, { type, data, seq: seq++ }),
    agent: () => store.snapshot().agents[0],
  };
}
test("parallel tools and approvals remain pending until every matching result arrives", () => {
  const { send, agent } = fixture();
  send("turn/start");
  send("tool/call", { callId: "a", name: "read_file" });
  send("tool/call", { callId: "b", name: "exec" });
  send("approval/asked", { id: "q1", toolName: "exec" });
  send("approval/asked", { id: "q2", toolName: "exec" });
  send("approval/decided", { id: "q1", outcome: "allowed-once" });
  assert.equal(agent().status, "waiting");
  send("tool/result", { message: { toolCallId: "a" } });
  assert.equal(agent().pendingTools, 1);
  assert.equal(agent().status, "waiting");
  send("approval/decided", { id: "q2", outcome: "rejected" });
  assert.equal(agent().status, "tool");
  send("tool/result", { message: { toolCallId: "b", isError: true } });
  assert.equal(agent().status, "thinking");
  assert.equal(agent().pendingTools, 0);
});
test("end reasons are not all reported as successes and pending state is cleared", () => {
  for (const [kind, status] of [
    ["completed", "done"],
    ["error", "error"],
    ["blocked", "blocked"],
    ["aborted", "paused"],
    ["max-tokens", "paused"],
    ["interrupted", "paused"],
    ["forked", "paused"],
  ]) {
    const { send, agent } = fixture();
    send("turn/start");
    send("approval/asked", { id: "q" });
    send("turn/end", { reason: { kind } });
    assert.equal(agent().status, status);
    assert.equal(agent().completed, kind === "completed" ? 1 : 0);
    assert.equal(agent().active, false);
    assert.equal(agent().pendingApprovals, 0);
  }
});
test("projection excludes sensitive content, includes cache tokens, and deduplicates sequence", () => {
  const { store, send, agent } = fixture();
  send("turn/start");
  send("user/message", { content: "SECRET PROMPT" });
  send("tool/call", {
    callId: "a",
    name: "read_file",
    arguments: "SECRET ARGUMENTS",
  });
  send("tool/result", {
    message: { toolCallId: "a", content: "SECRET RESULT" },
  });
  send("assistant/message", {
    message: { content: "SECRET REASONING" },
    usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 100 },
  });
  assert.equal(agent().tokens, 115);
  assert.equal(agent().project, "project");
  assert.equal(agent().role, "subagent");
  const before = store.snapshot().events.length;
  store.ingest(session, { type: "turn/start", seq: 0, data: {} });
  assert.equal(store.snapshot().events.length, before);
  assert.doesNotMatch(JSON.stringify(store.snapshot()), /SECRET|private/);
});
test("bounded history and agent capacity protect active sessions", () => {
  const { store, send } = fixture({ maxAgents: 1, maxEvents: 10 });
  send("turn/start");
  for (let i = 0; i < 20; i++) send("step/start");
  store.ingest({ id: "other" }, { type: "turn/start", data: {} });
  assert.equal(store.snapshot().agents.length, 1);
  assert.equal(store.snapshot().agents[0].id, "test-1");
  assert.equal(store.snapshot().events.length, 10);
  send("turn/end", { reason: { kind: "completed" } });
  store.ingest({ id: "other" }, { type: "turn/start", data: {} });
  assert.equal(store.snapshot().agents[0].id, "other");
});
test("invalid configuration is rejected before binding a server", () => {
  for (const config of [
    { port: 0 },
    { port: 65536 },
    { maxAgents: 0 },
    { maxEvents: 501 },
    { port: "4319" },
  ])
    assert.throws(() => options(config));
});
test("plugin registers only passive observers and lifecycle-owned resources", async () => {
  const handlers = new Map();
  let dispose;
  const ctx = {
    on: (name, fn) => handlers.set(name, fn),
    effect: (fn) => {
      dispose = fn();
    },
  };
  apply(ctx, { port: 4349 });
  assert.deepEqual([...handlers.keys()], ["session/event", "session/disposed"]);
  handlers.get("session/event")(session, {
    type: "turn/start",
    seq: 1,
    data: {},
  });
  await dispose();
});
