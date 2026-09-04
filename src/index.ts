/**
 * CLI entry point: `npm start` runs this file. The PORT environment
 * variable sets the listen port (default 3000; 0 picks an ephemeral port).
 */

import { resolvePort, startServer } from "./server.js";
import { API_NAME, VERSION } from "./meta.js";

const port = resolvePort(process.env);

startServer(port, () => {
  console.log(`${API_NAME} v${VERSION} listening on port ${port}`);
});
