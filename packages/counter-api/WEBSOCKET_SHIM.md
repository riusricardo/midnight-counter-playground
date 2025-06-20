# WebSocket Shim for Browser Builds

## Problem

The `@midnight-ntwrk/midnight-js-indexer-public-data-provider` library imports `isomorphic-ws` using a namespace import pattern:

```javascript
import * as ws from 'isomorphic-ws';
// Later tries to access: ws.WebSocket
```

However, `isomorphic-ws/browser.js` only provides a **default export**, not a named `WebSocket` export. This causes Vite build warnings:

```
"WebSocket" is not exported by "isomorphic-ws/browser.js"
```

## Solution

We created a WebSocket shim (`src/ws-shim.js`) that:

1. **Detects the browser's native WebSocket** from various global contexts
2. **Provides both named and default exports** to satisfy all import patterns:
   - `import { WebSocket } from 'isomorphic-ws'` (named import)
   - `import WebSocket from 'isomorphic-ws'` (default import)  
   - `import * as ws from 'isomorphic-ws'; ws.WebSocket` (namespace + property access)

## Configuration

The shim is configured in `apps/web/vite.config.ts` using Vite aliases:

```typescript
resolve: {
  alias: {
    // Replace both import paths with our shim
    'isomorphic-ws': path.resolve(__dirname, '../../packages/counter-api/src/ws-shim.js'),
    'isomorphic-ws/browser.js': path.resolve(__dirname, '../../packages/counter-api/src/ws-shim.js'),
  }
}
```

## Why This Approach

✅ **Benefits:**
- Only affects browser builds (Node.js still uses original isomorphic-ws)
- Clean and targeted solution
- No dependency on external polyfills
- Eliminates build warnings
- Uses browser's native WebSocket implementation

❌ **Alternatives Considered:**
- Modifying node_modules (not maintainable)
- Using different WebSocket library (would require changing Midnight dependencies)
- Polyfilling entire isomorphic-ws (unnecessary complexity)

## Files Involved

- `src/ws-shim.js` - The WebSocket shim implementation
- `apps/web/vite.config.ts` - Vite configuration with aliases
- This file - Documentation for future developers
