/**
 * Server application entry point.
 * Runtime layer — wires up services, providers, and starts the server.
 */

const PORT = parseInt(process.env['PORT'] || '3000', 10);

function main() {
  console.error(`[harness-server] Starting on port ${PORT}`);
  // TODO: Initialize providers, services, and runtime routes
}

main();
