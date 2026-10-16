import { OfficeStore } from "./store.mjs";
import { startServer } from "./server.mjs";
const store = new OfficeStore({ demo: true });
const sessions = ["Atlas", "Nova", "Sage", "Piper", "Echo", "Mochi"].map(
  (name, i) => ({
    id: `demo-${i}`,
    officeName: name,
    header: {
      cwd: "demo/launch-site",
      origin: i ? "subagent" : undefined,
      parentSession: i ? "demo-0" : undefined,
    },
  }),
);
let seq = new Map();
let tick = 0;
const push = (i, type, data = {}) => {
  const session = sessions[i];
  const n = seq.get(i) ?? 0;
  seq.set(i, n + 1);
  store.ingest(session, { type, data, seq: n, time: Date.now() });
};
for (let i = 0; i < 6; i++) push(i, "turn/start", { turn: 1 });
push(1, "tool/call", { callId: "job-1", name: "edit_file" });
push(2, "tool/call", { callId: "job-2", name: "web_search" });
push(3, "tool/call", { callId: "job-3", name: "exec_command" });
push(3, "approval/asked", { id: "ask-3", toolName: "exec_command" });
push(4, "turn/end", { reason: { kind: "completed" } });
push(5, "step/start", { step: 1 });
const timer = setInterval(() => {
  const i = tick % 6;
  const phase = (Math.floor(tick / 6) + [0, 1, 1, 2, 5, 0][i] + 1) % 6;
  tick++;
  if (phase === 0) push(i, "turn/start", { turn: tick });
  else if (phase === 1)
    push(i, "tool/call", {
      callId: `job-${i}`,
      name: [
        "read_file",
        "edit_file",
        "web_search",
        "exec_command",
        "run_tests",
        "git_diff",
      ][i],
    });
  else if (phase === 2)
    push(i, "approval/asked", { id: `ask-${i}`, toolName: "exec_command" });
  else if (phase === 3)
    push(i, "approval/decided", { id: `ask-${i}`, outcome: "allowed-once" });
  else if (phase === 4)
    push(i, "tool/result", {
      message: { toolCallId: `job-${i}`, isError: false },
    });
  else push(i, "turn/end", { reason: { kind: "completed" } });
}, 1600);
const port = Number(process.env.OFFICE_PORT || 4319);
const server = await startServer(store, { port });
console.info(`Agent Office DEMO (simulated events) → ${server.url}`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    clearInterval(timer);
    await server.close();
    process.exit(0);
  });
