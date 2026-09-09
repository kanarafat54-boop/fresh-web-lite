import fs from 'node:fs';

const fabric = fs.readFileSync('src/core/fresh-ai/FreshAIUniversalPowerFabric.ts', 'utf8');
const everywhere = fs.readFileSync('src/core/fresh-ai/FreshAIEverywhere.ts', 'utf8');

const requiredPowers = [
  'understand', 'conversation', 'knowledge', 'reasoning', 'memory',
  'creation', 'execution', 'communication', 'media', 'developer',
  'automation', 'verification', 'governance',
];

for (const power of requiredPowers) {
  if (!fabric.includes(`id: '${power}'`)) {
    throw new Error(`Missing canonical Fresh AI power: ${power}`);
  }
}

if (!fabric.includes('resolveFreshAIPower')) {
  throw new Error('Missing Fresh AI power resolver');
}

if (!fabric.includes('normalizeFreshAIPower')) {
  throw new Error('Missing Fresh AI power normalization');
}

if (!fabric.includes('assertFreshAIUniversalPowerIntegrity')) {
  throw new Error('Missing Fresh AI power integrity verifier');
}

if (!everywhere.includes('usesCanonicalGateway: true')) {
  throw new Error('Fresh AI Everywhere registry is not aligned to the canonical gateway contract');
}

console.log('Fresh AI Universal Power Fabric contract: PASS');
