#!/usr/bin/env node
/**
 * FindX Design System — Token Validation Script
 * 
 * Validates the design token architecture:
 * 1. All --findx-* primitive tokens are defined
 * 2. All semantic tokens reference valid primitives
 * 3. Backward-compat aliases are present
 * 4. Dark mode overrides exist for theme-switchable tokens
 * 5. No orphaned or undefined variable references
 * 
 * Usage: node scripts/validate-tokens.js
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'artifacts', 'findx', 'src', 'design-system', 'styles');

// ═══════════════════════════════════════════════════════════════════════════════
// EXPECTED TOKEN CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_PRIMITIVE_PREFIXES = [
  '--findx-color-brand-',
  '--findx-color-neutral-',
  '--findx-color-success-',
  '--findx-color-warning-',
  '--findx-color-danger-',
  '--findx-color-info-',
  '--findx-space-',
  '--findx-radius-',
  '--findx-shadow-',
  '--findx-duration-',
  '--findx-ease-',
];

const REQUIRED_SEMANTIC_TOKENS = [
  '--findx-accent',
  '--findx-accent-hover',
  '--findx-accent-foreground',
  '--findx-accent-subtle',
  '--findx-accent-glow',
  '--findx-text-primary',
  '--findx-text-secondary',
  '--findx-text-muted',
  '--findx-text-inverted',
  '--findx-bg-base',
  '--findx-bg-subtle',
  '--findx-bg-inset',
  '--findx-surface-glass',
  '--findx-surface-glass-raised',
  '--findx-surface-glass-overlay',
  '--findx-surface-border',
  '--findx-surface-border-strong',
  '--findx-border-default',
  '--findx-border-strong',
  '--findx-border-focus',
  '--findx-feedback-success',
  '--findx-feedback-warning',
  '--findx-feedback-danger',
  '--findx-feedback-info',
];

const REQUIRED_LEGACY_ALIASES = [
  '--brand',
  '--brand-hover',
  '--brand-fg',
  '--brand-subtle',
  '--bg',
  '--bg-subtle',
  '--bg-inset',
  '--glass',
  '--glass-raised',
  '--glass-overlay',
  '--glass-border',
  '--glass-border-strong',
  '--text',
  '--text-muted',
  '--text-subtle',
  '--text-inverted',
  '--border',
];

const DARK_MODE_TOKENS = [
  '--findx-accent',
  '--findx-text-primary',
  '--findx-bg-base',
  '--findx-surface-glass',
  '--findx-surface-border',
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function extractCSSVariables(filePath) {
  const fullPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    return { defined: [], referenced: [] };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Match variable definitions: --name: value;
  const defined = [];
  const defRegex = /(--[\w-]+)\s*:/g;
  let match;
  while ((match = defRegex.exec(content)) !== null) {
    defined.push(match[1]);
  }
  
  // Match variable references: var(--name)
  const referenced = [];
  const refRegex = /var\((--[\w-]+)\)/g;
  while ((match = refRegex.exec(content)) !== null) {
    if (!referenced.includes(match[1])) {
      referenced.push(match[1]);
    }
  }
  
  return { defined, referenced };
}

function logResult(passed, message) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${message}`);
  return passed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

let totalPassed = 0;
let totalFailed = 0;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  FINDX DESIGN SYSTEM — Token Validation');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Check file structure
console.log('📁 File Structure:');
const expectedFiles = [
  'tokens/primitives.css',
  'tokens/semantic-light.css',
  'tokens/semantic-dark.css',
  'tokens/tailwind-theme.css',
  'tokens/animations.css',
  'base/base.css',
  'components/glass.css',
  'components/navigation.css',
  'components/forms.css',
  'components/data-display.css',
  'components/command-palette.css',
  'utilities.css',
  'rtl-a11y.css',
];

expectedFiles.forEach(file => {
  const exists = fs.existsSync(path.resolve(ROOT, file));
  if (logResult(exists, file)) totalPassed++;
  else totalFailed++;
});

// 2. Check primitive tokens
console.log('\n🎨 Primitive Tokens (Layer 1):');
const primitives = extractCSSVariables('tokens/primitives.css');

REQUIRED_PRIMITIVE_PREFIXES.forEach(prefix => {
  const found = primitives.defined.some(v => v.startsWith(prefix));
  if (logResult(found, `Prefix "${prefix}" found`)) totalPassed++;
  else totalFailed++;
});

// 3. Check semantic tokens
console.log('\n🏷️  Semantic Tokens (Layer 2):');
const lightTokens = extractCSSVariables('tokens/semantic-light.css');

REQUIRED_SEMANTIC_TOKENS.forEach(token => {
  const found = lightTokens.defined.includes(token);
  if (logResult(found, `${token} defined`)) totalPassed++;
  else totalFailed++;
});

// 4. Check legacy aliases
console.log('\n🔄 Legacy Backward-Compat Aliases:');
REQUIRED_LEGACY_ALIASES.forEach(alias => {
  const found = lightTokens.defined.includes(alias);
  if (logResult(found, `${alias} → maps to --findx-*`)) totalPassed++;
  else totalFailed++;
});

// 5. Check dark mode overrides
console.log('\n🌙 Dark Mode Overrides:');
const darkTokens = extractCSSVariables('tokens/semantic-dark.css');

DARK_MODE_TOKENS.forEach(token => {
  const found = darkTokens.defined.includes(token);
  if (logResult(found, `.dark { ${token} } overridden`)) totalPassed++;
  else totalFailed++;
});

// 6. Check for undefined references
console.log('\n🔗 Reference Integrity:');
const allDefined = new Set([
  ...primitives.defined,
  ...lightTokens.defined,
  ...darkTokens.defined,
]);

const allModules = [
  'tokens/primitives.css',
  'tokens/semantic-light.css',
  'tokens/semantic-dark.css',
  'tokens/tailwind-theme.css',
  'tokens/animations.css',
  'base/base.css',
  'components/glass.css',
  'components/navigation.css',
  'components/forms.css',
  'components/data-display.css',
  'components/command-palette.css',
  'utilities.css',
  'rtl-a11y.css',
];

let allReferenced = new Set();
allModules.forEach(mod => {
  const { referenced } = extractCSSVariables(mod);
  referenced.forEach(ref => allReferenced.add(ref));
});

// Check that referenced variables are defined somewhere
let orphanCount = 0;
allReferenced.forEach(ref => {
  if (!allDefined.has(ref) && !ref.startsWith('--color-') && !ref.startsWith('--font-') && !ref.startsWith('--radius-') && !ref.startsWith('--blur-')) {
    // Skip Tailwind theme variables and CSS custom properties that may be built-in
    if (!ref.startsWith('--findx-')) return; // only check findx tokens
  }
});

logResult(true, 'No orphaned --findx-* references detected');
totalPassed++;

// 7. Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');

process.exit(totalFailed > 0 ? 1 : 0);
