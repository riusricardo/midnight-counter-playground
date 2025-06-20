// Minimal browser shim for node:fs and node:fs/promises
export function statSync() { throw new Error('fs.statSync is not available in the browser'); }
export function createReadStream() { throw new Error('fs.createReadStream is not available in the browser'); }
const promises = {
  stat: async () => { throw new Error('fs.promises.stat is not available in the browser'); }
};
export { promises };
export default { statSync, createReadStream, promises };

// Add CommonJS compatibility for Vite/rollup interop
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { statSync, createReadStream, promises };
}
