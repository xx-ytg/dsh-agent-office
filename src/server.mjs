import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);

export async function startServer(store, { port = 4319 } = {}) {
  const clients = new Set();
  let scheduled;
  let closed = false;
  const send = (res) => {
    if (!res.destroyed && res.writableLength < 256_000)
      res.write(`data: ${JSON.stringify(store.snapshot())}\n\n`);
    else res.destroy();
  };
  const unsubscribe = store.subscribe(() => {
    if (!scheduled && !closed)
      scheduled = setTimeout(() => {
        scheduled = undefined;
        for (const res of clients) send(res);
      }, 80);
  });
  const server = createServer(async (req, res) => {
    // Loopback only, with Host/Origin checks to reject DNS rebinding and cross-site reads.
    const address = server.address();
    const expected = `127.0.0.1:${address.port}`;
    if (
      req.headers.host !== expected &&
      req.headers.host !== `localhost:${address.port}`
    ) {
      res.writeHead(403).end("Invalid host");
      return;
    }
    if (
      req.headers.origin &&
      ![`http://${expected}`, `http://localhost:${address.port}`].includes(
        req.headers.origin,
      )
    ) {
      res.writeHead(403).end("Invalid origin");
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" }).end();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    );
    const path = new URL(req.url, `http://${expected}`).pathname;
    if (path === "/api/state") {
      res
        .writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        .end(JSON.stringify(store.snapshot()));
      return;
    }
    if (path === "/api/events") {
      if (clients.size >= 24) {
        res.writeHead(503).end("Too many viewers");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        Connection: "keep-alive",
      });
      res.write("retry: 2000\n\n");
      clients.add(res);
      send(res);
      res.on("close", () => clients.delete(res));
      return;
    }
    const file = assets.get(path);
    if (!file) {
      res.writeHead(404).end("Not found");
      return;
    }
    try {
      const body = await readFile(
        new URL(`../public/${file[0]}`, import.meta.url),
      );
      res.writeHead(200, { "Content-Type": file[1] }).end(body);
    } catch {
      res.writeHead(500).end("Unable to load Office assets");
    }
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
  } catch (error) {
    unsubscribe();
    throw error;
  }
  const heartbeat = setInterval(() => {
    for (const res of clients) if (!res.destroyed) res.write(": heartbeat\n\n");
  }, 15_000);
  server.on("error", (error) =>
    console.error("[agent-office] server error:", error.message),
  );
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    async close() {
      if (closed) return;
      closed = true;
      unsubscribe();
      clearTimeout(scheduled);
      clearInterval(heartbeat);
      for (const res of clients) res.end();
      clients.clear();
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    },
  };
}
