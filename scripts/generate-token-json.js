#!/usr/bin/env node
/**
 * FindX Design System — Token JSON Generator
 * 
 * Reads the CSS primitive tokens and generates a tokens.json file
 * that can be consumed by design tools, mobile apps, or other platforms.
 * 
 * Usage: node scripts/generate-token-json.js
 * Output: artifacts/findx/src/design-system/tokens/tokens.json
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const PRIMITIVES_PATH = path.resolve(
  __dirname, '..', 'artifacts', 'findx', 'src', 
  'design-system', 'styles', 'tokens', 'primitives.css'
);
const OUTPUT_PATH = path.resolve(
  __dirname, '..', 'artifacts', 'findx', 'src', 
  'design-system', 'tokens', 'tokens.json'
);

function parsePrimitives(css) {
  const tokens = {};
  const regex = /(--findx-([\w-]+))\s*:\s*([^;]+);/g;
  let match;
  
  while ((match = regex.exec(css)) !== null) {
    const [, fullName, name, value] = match;
    tokens[fullName] = value.trim();
  }
  
  return tokens;
}

function categorize(tokens) {
  const categories = {
    colors: {},
    spacing: {},
    radius: {},
    shadows: {},
    typography: {},
    motion: {},
    zIndex: {},
    blur: {},
  };
  
  Object.entries(tokens).forEach(([name, value]) => {
    if (name.startsWith('--findx-color-')) categories.colors[name] = value;
    else if (name.startsWith('--findx-space-')) categories.spacing[name] = value;
    else if (name.startsWith('--findx-radius-')) categories.radius[name] = value;
    else if (name.startsWith('--findx-shadow-')) categories.shadows[name] = value;
    else if (name.startsWith('--findx-text-') || name.startsWith('--findx-font-') || name.startsWith('--findx-leading-')) categories.typography[name] = value;
    else if (name.startsWith('--findx-duration-') || name.startsWith('--findx-ease-') || name.startsWith('--findx-delay-')) categories.motion[name] = value;
    else if (name.startsWith('--findx-z-')) categories.zIndex[name] = value;
    else if (name.startsWith('--findx-blur-')) categories.blur[name] = value;
  });
  
  return categories;
}

// Main
console.log('🔄 Generating tokens.json from CSS primitives...');

const css = fs.readFileSync(PRIMITIVES_PATH, 'utf-8');
const tokens = parsePrimitives(css);
const categorized = categorize(tokens);

const output = {
  $schema: 'https://design-tokens.github.io/community-group/format/',
  version: '2.0.0',
  name: 'FindX Design System',
  description: 'Liquid Glass Design System for AI-powered B2B SaaS',
  lastUpdated: new Date().toISOString().split('T')[0],
  tokenCount: Object.keys(tokens).length,
  tokens: categorized,
  flat: tokens,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

console.log(`✅ Generated tokens.json with ${Object.keys(tokens).length} tokens`);
console.log(`   📄 ${OUTPUT_PATH}`);
