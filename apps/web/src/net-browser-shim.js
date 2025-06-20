// Minimal browser shim for node:net.isIP
function isIP() { return 0; }
function isIPv4() { return false; }
function isIPv6() { return false; }
export { isIP, isIPv4, isIPv6 };
export default { isIP, isIPv4, isIPv6 };
