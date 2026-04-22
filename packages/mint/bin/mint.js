#!/usr/bin/env node

/**
 * Mint CLI — starts the Mint web UI serving the current working directory.
 *
 * Usage:
 *   mint start [--port=3000]
 *   mint dev   [--port=3000]
 */

const { spawn } = require('child_process');
const { resolve, dirname } = require('path');

const args = process.argv.slice(2);
const command = args[0];

// mint package directory (where package.json and node_modules live)
const pkgDir = dirname(__dirname);

function startServer(dev) {
  const port =
    args.find(function (a) { return a.startsWith('--port='); })?.split('=')[1] || '3000';
  const cwd = process.cwd();

  var nextBin = resolve(pkgDir, 'node_modules/.bin/next');

  var child = spawn(nextBin, [dev ? 'dev' : 'start', '--port', port], {
    cwd: pkgDir,
    env: Object.assign({}, process.env, { MINT_CWD: cwd }),
    stdio: 'inherit',
  });

  console.log('');
  console.log('  Mint — working directory: ' + cwd);
  console.log('  Ready on http://localhost:' + port);
  console.log('');

  child.on('exit', function (code) { process.exit(code || 0); });
}

if (command === 'start') {
  startServer(false);
} else if (command === 'dev') {
  startServer(true);
} else {
  console.log('');
  console.log('  Usage: mint <command>');
  console.log('');
  console.log('  Commands:');
  console.log('    start    Start production server (serves current directory)');
  console.log('    dev      Start dev server (serves current directory)');
  console.log('');
  console.log('  Options:');
  console.log('    --port=  Port number (default: 3000)');
  console.log('');
  process.exit(1);
}
