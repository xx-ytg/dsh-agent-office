// Projection of the released DSH session/event contract. Never retains prompts,
// tool arguments, results, reasoning, full paths, or approval explanations.
const watched = new Set([
  "turn/start",
  "step/start",
  "assistant/message",
  "tool/call",
  "tool/result",
  "approval/asked",
  "approval/decided",
  "turn/end",
]);
const clip = (value, length = 100) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, length);
const count = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);

export class OfficeStore {
  constructor({
    maxAgents = 48,
    maxEvents = 120,
    demo = false,
    now = Date.now,
  } = {}) {
    this.maxAgents = maxAgents;
    this.maxEvents = maxEvents;
    this.demo = demo;
    this.now = now;
    this.agents = new Map();
    this.events = [];
    this.listeners = new Set();
    this.revision = 0;
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify() {
    this.revision++;
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        /* observers cannot break agents */
      }
    }
  }
  ensure(session) {
    const id = clip(session?.id, 180);
    if (!id) return;
    if (!this.agents.has(id)) {
      if (this.agents.size >= this.maxAgents) {
        const victim = [...this.agents.values()]
          .filter((a) => !a.active)
          .sort((a, b) => a.updatedAt - b.updatedAt)[0];
        if (!victim) return; // Never evict a running agent to make room for an idle one.
        this.agents.delete(victim.id);
      }
      const header = session.header ?? {};
      const project = clip(
        String(header.cwd ?? "")
          .split(/[\\/]/)
          .filter(Boolean)
          .pop() || "Workspace",
        48,
      );
      this.agents.set(id, {
        id,
        name: clip(
          session.officeName ||
            `${header.origin === "subagent" ? "Worker" : "Agent"} ${id.slice(0, 6)}`,
          48,
        ),
        project,
        parentId: clip(header.parentSession, 180),
        role: header.origin === "subagent" ? "subagent" : "session",
        status: "idle",
        active: false,
        detail: "Ready for the next task",
        tools: new Map(),
        approvals: new Map(),
        steps: 0,
        calls: 0,
        completed: 0,
        tokens: 0,
        lastSeq: -1,
        updatedAt: this.now(),
      });
    }
    return this.agents.get(id);
  }
  ingest(session, event) {
    if (!watched.has(event?.type)) return false;
    const a = this.ensure(session);
    if (!a) return false;
    if (Number.isInteger(event.seq)) {
      if (event.seq <= a.lastSeq) return false;
      a.lastSeq = event.seq;
    }
    const d = event.data ?? {};
    let note;
    a.updatedAt = this.now();
    switch (event.type) {
      case "turn/start":
        a.tools.clear();
        a.approvals.clear();
        a.active = true;
        a.status = "thinking";
        a.detail = "Planning the next move";
        note = "Started a new turn";
        break;
      case "step/start":
        a.steps++;
        a.active = true;
        this.working(a);
        note = "Thinking through the next step";
        break;
      case "assistant/message":
        // TokenUsage fields are verified against dsh-llm/src/types.ts.
        a.tokens +=
          d.usage?.totalTokens !== undefined
            ? count(d.usage.totalTokens)
            : count(d.usage?.inputTokens) +
              count(d.usage?.outputTokens) +
              count(d.usage?.cacheReadTokens) +
              count(d.usage?.cacheWriteTokens);
        this.working(a);
        note = "Model response received";
        break;
      case "tool/call": {
        const tool = clip(d.name || "tool", 72);
        a.tools.set(clip(d.callId, 180), tool);
        a.calls++;
        a.active = true;
        this.working(a);
        note = `Called ${tool}`;
        break;
      }
      case "tool/result": {
        const id = clip(d.message?.toolCallId, 180);
        const tool = a.tools.get(id) || "tool";
        a.tools.delete(id);
        this.working(a);
        note = `${tool} ${d.message?.isError ? "failed" : "returned"}`;
        if (d.message?.isError && !a.approvals.size && !a.tools.size) {
          a.status = "thinking";
          a.detail = "Recovering from a tool error";
        }
        break;
      }
      case "approval/asked":
        a.approvals.set(clip(d.id, 180), clip(d.toolName || "tool", 72));
        this.working(a);
        note = "Waiting for your approval in Harness";
        break;
      case "approval/decided":
        a.approvals.delete(clip(d.id, 180));
        this.working(a);
        note = `Approval: ${clip(d.outcome, 40)}`;
        break;
      case "turn/end": {
        a.active = false;
        a.tools.clear();
        a.approvals.clear();
        const reason = d.reason?.kind;
        a.status =
          reason === "completed"
            ? "done"
            : reason === "error"
              ? "error"
              : reason === "blocked"
                ? "blocked"
                : "paused";
        a.detail =
          reason === "completed"
            ? "Turn complete"
            : `Turn ended: ${clip(reason || "unknown", 40)}`;
        if (reason === "completed") a.completed++;
        note = a.detail;
        break;
      }
    }
    this.events.unshift({
      id: ++this.revision,
      agentId: a.id,
      name: a.name,
      type: event.type,
      text: note,
      time: this.now(),
    });
    this.events.length = Math.min(this.events.length, this.maxEvents);
    this.notify();
    return true;
  }
  working(a) {
    if (a.approvals.size) {
      a.status = "waiting";
      a.detail = `Approval needed · ${[...a.approvals.values()][0]}`;
    } else if (a.tools.size) {
      a.status = "tool";
      a.detail = [...a.tools.values()].join(" + ").slice(0, 120);
    } else {
      a.status = a.active ? "thinking" : "idle";
      a.detail = a.active
        ? "Thinking through the task"
        : "Ready for the next task";
    }
  }
  disposeSession(session) {
    const a = this.agents.get(clip(session?.id, 180));
    if (!a) return;
    a.active = false;
    a.tools.clear();
    a.approvals.clear();
    if (!["done", "error", "blocked"].includes(a.status)) {
      a.status = "paused";
      a.detail = "Session detached";
    }
    a.updatedAt = this.now();
    this.notify();
  }
  snapshot() {
    return {
      version: 1,
      revision: this.revision,
      mode: this.demo ? "demo" : "live",
      time: this.now(),
      agents: [...this.agents.values()].map(({ tools, approvals, ...a }) => ({
        ...a,
        pendingTools: tools.size,
        pendingApprovals: approvals.size,
      })),
      events: this.events.slice(),
      totals: {
        agents: this.agents.size,
        active: [...this.agents.values()].filter((a) => a.active).length,
        waiting: [...this.agents.values()].filter((a) => a.status === "waiting")
          .length,
        completed: [...this.agents.values()].reduce(
          (n, a) => n + a.completed,
          0,
        ),
        calls: [...this.agents.values()].reduce((n, a) => n + a.calls, 0),
      },
    };
  }
}
