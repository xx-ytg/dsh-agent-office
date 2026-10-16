import { fileURLToPath } from "node:url";
// JSON strings are valid YAML scalars, including Windows paths with backslashes.
const entry = fileURLToPath(new URL("../src/index.mjs", import.meta.url));
process.stdout.write(
  `- insert:\n    - id: agent-office\n      name: ${JSON.stringify(entry)}\n      config:\n        port: 4319\n        maxAgents: 48\n        maxEvents: 120\n`,
);
