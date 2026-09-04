import { createServer } from "node:http";
import { App } from "./lib/server/app.js";
import { createRequestHandler } from "./lib/http.js";
import { SERVICE_INFO } from "./config.js";

const app = new App(SERVICE_INFO);

/** Port to listen on, taken from the environment or a sensible default. */
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

/** Host to bind; 0.0.0.0 lets the preview environment and containers reach us. */
const HOST = process.env.HOST ?? "0.0.0.0";

const server = createServer(createRequestHandler(app));

server.listen(PORT, HOST, () => {
  console.log(`${SERVICE_INFO.name} v${SERVICE_INFO.version} listening on http://${HOST}:${PORT}`);
});

/** Close the server cleanly on shutdown signals. */
function shutdown(signal: string): void {
  console.log(`Received ${signal}; shutting down.`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
