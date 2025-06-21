#!/usr/bin/env node

/**
 * Simple deployment test script - Run this to test deployment without the browser
 */

console.log('🧪 Testing Counter Contract Deployment...');
console.log();

async function testDeployment() {
  try {
    // Import the working CLI version
    console.log('📥 Importing CLI deployment function...');
    const { deploy, configureProviders, buildFreshWallet } = await import('./packages/counter-api/src/api.js');
    const { contractConfig } = await import('./packages/counter-api/src/config.js');
    const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
    
    console.log('✅ Successfully imported CLI functions');
    
    // This would require setting up providers like the CLI does
    console.log('⚠️  Full deployment test requires wallet setup');
    console.log('   Use the CLI instead: cd packages/counter-cli && npm run start');
    
  } catch (error) {
    console.log('❌ Import failed (expected in browser environment):', error.message);
  }
}

// Version comparison
async function compareVersions() {
  console.log('🔍 Comparing deployment approaches...');
  console.log();
  
  console.log('📄 CLI approach (working):');
  console.log('  File: packages/counter-api/src/api.ts');
  console.log('  Function: deploy()');
  console.log('  Contract: counterContractInstance');
  console.log('  Environment: Node.js');
  console.log();
  
  console.log('📄 UI approach (failing):');
  console.log('  File: packages/counter-api/src/api-ui.ts');
  console.log('  Function: CounterAPI.deploy()');
  console.log('  Contract: counterContractInstance (now fixed)');
  console.log('  Environment: Browser');
  console.log();
  
  console.log('🔧 Key differences to investigate:');
  console.log('  1. Provider initialization differences');
  console.log('  2. ZK config provider versions');
  console.log('  3. Proof provider setup');
  console.log('  4. Wallet provider configuration');
  console.log();
  
  console.log('📊 Quick debugging steps:');
  console.log('  1. Open browser dev tools');
  console.log('  2. Try deployment and check console for "=== DEPLOYMENT DEBUG START ==="');
  console.log('  3. Compare provider object structure with CLI');
  console.log('  4. Look for version mismatches in logged data');
  console.log();
}

// Run the comparison
compareVersions();

console.log('🚀 Next steps:');
console.log('  1. Build the project: yarn build');
console.log('  2. Start the development server: yarn dev');
console.log('  3. Open browser dev tools before trying deployment');
console.log('  4. Compare debug output with CLI deployment');
console.log();
console.log('📝 If versions still mismatch, check:');
console.log('  - Midnight SDK package versions in package.json files');
console.log('  - ZK config provider initialization differences');
console.log('  - Proof server configuration differences');
