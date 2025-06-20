#!/usr/bin/env node
// scripts/fix-stream-browserify.js
// Ensures a browser-compatible web.js stub exists for stream-browserify in all locations required by node-stdlib-browser and other polyfill consumers.
// This is a robust workaround for monorepo/yarn hoisting issues with stream-browserify@2.x and browser polyfills.

const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Minimal stub for stream-browserify/web.js (safe for browser usage)
const webJsStub = `// stream-browserify/web.js stub for browser builds\nmodule.exports = {};\n`;

function ensureWebJs(targetDir) {
  const target = path.join(targetDir, 'web.js');
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(target, webJsStub, { flag: 'w' });
    console.log(`[fix-stream-browserify] Stub written: ${target}`);
  } catch (err) {
    console.error(`[fix-stream-browserify] Failed to write stub at ${target}:`, err);
    process.exitCode = 1;
  }
}

// 1. Ensure web.js exists in node_modules/stream-browserify
const streamBrowserifyDir = path.join(root, 'node_modules', 'stream-browserify');
ensureWebJs(streamBrowserifyDir);

// 2. Ensure web.js exists in node_modules/node-stdlib-browser/node_modules/stream-browserify
const nestedDir = path.join(root, 'node_modules', 'node-stdlib-browser', 'node_modules', 'stream-browserify');
ensureWebJs(nestedDir);

console.log('[fix-stream-browserify] web.js stub ensured in all required locations.');
