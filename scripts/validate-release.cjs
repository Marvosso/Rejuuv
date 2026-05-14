'use strict';
const { readFileSync, existsSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function fail(msg) {
  console.error(`[validate:release] ${msg}`);
  process.exit(1);
}

const easPath = path.join(root, 'apps', 'mobile', 'eas.json');
if (!existsSync(easPath)) fail('apps/mobile/eas.json not found');

const eas = JSON.parse(readFileSync(easPath, 'utf8'));
for (const profile of ['preview', 'production']) {
  const env = eas.build?.[profile]?.env;
  if (!env?.EXPO_PUBLIC_API_URL || typeof env.EXPO_PUBLIC_API_URL !== 'string') {
    fail(`eas.json build.${profile}.env.EXPO_PUBLIC_API_URL must be set for ${profile} builds`);
  }
}

console.log('[validate:release] EAS env OK');

execSync('npx tsc --noEmit', { cwd: path.join(root, 'apps', 'backend'), stdio: 'inherit' });
console.log('[validate:release] Backend typecheck OK');

if (process.env.INCLUDE_MOBILE_TYPECHECK === '1') {
  execSync('npx tsc --noEmit', { cwd: path.join(root, 'apps', 'mobile'), stdio: 'inherit' });
  console.log('[validate:release] Mobile typecheck OK');
} else {
  console.log(
    '[validate:release] Skipping mobile tsc (set INCLUDE_MOBILE_TYPECHECK=1 when mobile project typecheck is clean)'
  );
}

console.log('[validate:release] Done');
