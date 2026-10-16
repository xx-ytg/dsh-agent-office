import test from "node:test";
import assert from "node:assert/strict";
import { OfficeStore } from "../src/store.mjs";
import { startServer } from "../src/server.mjs";
import { get } from "node:http";
test("HTTP serves assets, restricts origins and methods, and streams state", async () => {
  const store = new OfficeStore();
  const server = await startServer(store, { port: 0 });
  try {
    const html = await fetch(server.url);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Agent Office/);
    assert.match(
      html.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.equal((await fetch(server.url + "/missing")).status, 404);
    assert.equal(
      (await fetch(server.url + "/api/state", { method: "POST" })).status,
      405,
    );
    assert.equal(
      (
        await fetch(server.url + "/api/state", {
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    const rebinding = await new Promise((resolve, reject) =>
      get(
        server.url + "/api/state",
        { headers: { Host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      ).on("error", reject),
    );
    assert.equal(rebinding, 403);
    const controller = new AbortController();
    const response = await fetch(server.url + "/api/events", {
      signal: controller.signal,
    });
    const reader = response.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /"mode":"live"/);
    store.ingest(
      { id: "stream-test" },
      { type: "turn/start", seq: 0, data: {} },
    );
    const update = new TextDecoder().decode((await reader.read()).value);
    assert.match(update, /stream-test/);
    controller.abort();
    const state = await (await fetch(server.url + "/api/state")).json();
    assert.equal(state.totals.active, 1);
  } finally {
    await server.close();
  }
});
test("occupied port fails cleanly and resources can restart", async () => {
  const store = new OfficeStore();
  const one = await startServer(store, { port: 0 });
  const port = Number(new URL(one.url).port);
  try {
    await assert.rejects(() => startServer(store, { port }), {
      code: "EADDRINUSE",
    });
  } finally {
    await one.close();
  }
  const two = await startServer(store, { port });
  await two.close();
  await two.close();
  assert.equal(store.listeners.size, 0);
});
