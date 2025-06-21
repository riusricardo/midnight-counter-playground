#!/usr/bin/env node

/**
 * Debug script to compare CLI vs UI deployment approaches
 * Run this to see the differences between working and failing deployments
 */

console.log('=== DEPLOYMENT COMPARISON DEBUG SCRIPT ===');
console.log();

// Check if we're in the right directory
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the root of the midnight-app-test directory');
  process.exit(1);
}

console.log('✅ Running from correct directory');
console.log();

// Check for key files
const filesToCheck = [
  'packages/counter-api/src/api.ts',
  'packages/counter-api/src/api-ui.ts',
  'packages/counter-contract/src/witnesses.ts',
  'packages/ui/components/CounterComponent.tsx'
];

console.log('📁 Checking key files:');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});
console.log();

// Compare API imports
console.log('🔍 Analyzing import differences:');
console.log();

try {
  const apiContent = fs.readFileSync('packages/counter-api/src/api.ts', 'utf8');
  const apiUiContent = fs.readFileSync('packages/counter-api/src/api-ui.ts', 'utf8');
  
  // Extract import statements
  const apiImports = apiContent.match(/^import .+$/gm) || [];
  const apiUiImports = apiUiContent.match(/^import .+$/gm) || [];
  
  console.log('📄 api.ts imports:');
  apiImports.forEach(imp => console.log(`  ${imp}`));
  console.log();
  
  console.log('📄 api-ui.ts imports:');
  apiUiImports.forEach(imp => console.log(`  ${imp}`));
  console.log();
  
  // Check for differences
  const apiImportsSet = new Set(apiImports);
  const apiUiImportsSet = new Set(apiUiImports);
  
  const onlyInApi = apiImports.filter(imp => !apiUiImportsSet.has(imp));
  const onlyInApiUi = apiUiImports.filter(imp => !apiImportsSet.has(imp));
  
  if (onlyInApi.length > 0) {
    console.log('⚠️  Imports only in api.ts:');
    onlyInApi.forEach(imp => console.log(`  ${imp}`));
    console.log();
  }
  
  if (onlyInApiUi.length > 0) {
    console.log('⚠️  Imports only in api-ui.ts:');
    onlyInApiUi.forEach(imp => console.log(`  ${imp}`));
    console.log();
  }
  
} catch (error) {
  console.error('❌ Error reading API files:', error.message);
}

// Instructions for debugging
console.log('🔧 DEBUGGING STEPS:');
console.log();
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Try to deploy a contract from the UI');
console.log('4. Look for the detailed logs starting with "=== DEPLOYMENT DEBUG START ==="');
console.log('5. Compare the logged providers object with CLI deployment');
console.log();
console.log('6. To see CLI deployment logs, run:');
console.log('   cd packages/counter-cli && npm run start');
console.log();
console.log('7. Key things to compare:');
console.log('   - Providers structure differences');
console.log('   - Contract instance differences');
console.log('   - Witnesses object differences');
console.log('   - Private state format differences');
console.log();
console.log('8. If you see version mismatch errors, check:');
console.log('   - ZK config provider versions');
console.log('   - Proof provider versions');
console.log('   - Wallet provider versions');
console.log();

// Check package versions
console.log('📦 Package version analysis:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const midnightPackages = Object.entries(dependencies)
    .filter(([name]) => name.includes('@midnight-ntwrk'))
    .sort();
  
  if (midnightPackages.length > 0) {
    console.log('   Midnight packages:');
    midnightPackages.forEach(([name, version]) => {
      console.log(`     ${name}: ${version}`);
    });
  }
} catch (error) {
  console.log('   ❌ Could not read root package.json');
}
console.log();

console.log('🚀 Quick test commands:');
console.log();
console.log('To test CLI deployment (working):');
console.log('  cd packages/counter-cli && npm run start');
console.log();
console.log('To test UI deployment (failing):');
console.log('  npm run dev');
console.log('  # Then open browser and try Deploy & Manage tab');
console.log();
console.log('=== END DEBUG SCRIPT ===');
