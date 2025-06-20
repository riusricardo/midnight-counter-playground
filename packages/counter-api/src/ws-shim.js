/**
 * WebSocket Shim for Browser Environments
 * 
 * PROBLEM:
 * The @midnight-ntwrk/midnight-js-indexer-public-data-provider library imports isomorphic-ws
 * as a namespace (import * as ws from 'isomorphic-ws') and tries to access ws.WebSocket.
 * However, isomorphic-ws/browser.js only provides a default export, not a named WebSocket export.
 * This causes build warnings: "WebSocket" is not exported by "isomorphic-ws/browser.js"
 * 
 * SOLUTION:
 * This shim provides both named and default WebSocket exports by detecting the browser's
 * native WebSocket implementation. It's configured in vite.config.ts to replace both
 * 'isomorphic-ws' and 'isomorphic-ws/browser.js' imports in browser builds.
 * 
 * USAGE:
 * - Configured via Vite alias in apps/web/vite.config.ts
 * - Only affects browser builds (Node.js still uses the original isomorphic-ws)
 * - Automatically detects WebSocket from various global contexts
 */

// Detect the WebSocket implementation from the browser environment
let WebSocketImpl = null;

if (typeof WebSocket !== 'undefined') {
  // Standard browser environment - WebSocket is available globally
  WebSocketImpl = WebSocket;
} else if (typeof global !== 'undefined' && global.WebSocket) {
  // Node.js-like environment with global.WebSocket (shouldn't occur in browser, but safety check)
  WebSocketImpl = global.WebSocket;
} else if (typeof window !== 'undefined' && window.WebSocket) {
  // Explicit window.WebSocket check (redundant with first check, but explicit)
  WebSocketImpl = window.WebSocket;
} else if (typeof self !== 'undefined' && self.WebSocket) {
  // Web Workers or Service Workers environment
  WebSocketImpl = self.WebSocket;
}

// Export both named and default exports to satisfy different import patterns:
// - import { WebSocket } from 'isomorphic-ws' (named import)
// - import WebSocket from 'isomorphic-ws' (default import)
// - import * as ws from 'isomorphic-ws'; ws.WebSocket (namespace import + property access)
export const WebSocket = WebSocketImpl;
export default WebSocketImpl;
