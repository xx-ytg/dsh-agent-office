import { OfficeStore } from "./store.mjs";
import { startServer } from "./server.mjs";
export const name = "agent-office";
export function options(config = {}) {
  const out = {
    port: config.port ?? 4319,
    maxAgents: config.maxAgents ?? 48,
    maxEvents: config.maxEvents ?? 120,
  };
  for (const [key, min, max] of [
    ["port", 1024, 65535],
    ["maxAgents", 1, 200],
    ["maxEvents", 10, 500],
  ]) {
    if (!Number.isInteger(out[key]) || out[key] < min || out[key] > max)
      throw new TypeError(
        `agent-office: ${key} must be an integer between ${min} and ${max}`,
      );
  }
  return out;
}
// Runs at the profile root so session-scoped events from all child agents reach us.
// This is an observer: no middleware, tool registration, model call, or approval decision.
export function apply(ctx, config = {}) {
  const settings = options(config);
  const store = new OfficeStore(settings);
  ctx.on("session/event", (session, event) => store.ingest(session, event));
  ctx.on("session/disposed", (session) => store.disposeSession(session));
  ctx.effect(() => {
    let disposed = false;
    let handle;
    const pending = startServer(store, settings)
      .then((server) => {
        handle = server;
        if (disposed) return server.close();
        console.info(
          `[agent-office] Your agents have moved in → ${server.url}`,
        );
      })
      .catch((error) => {
        console.error(
          `[agent-office] Could not open desktop: ${error.message}. Change config.port if it is occupied.`,
        );
      });
    return async () => {
      disposed = true;
      await pending;
      if (handle) await handle.close();
    };
  });
}
