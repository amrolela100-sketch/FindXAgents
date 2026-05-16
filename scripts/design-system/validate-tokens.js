#!/usr/bin/env node
/**
 * FindX Design System — Token Validator
 * 
 * Validates design tokens against W3C Design Token Community Group format.
 * 
 * Usage:
 *   node scripts/design-system/validate-tokens.js
 * 
 * Exit codes:
 *   0 = all valid
 *   1 = validation errors found
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = join(__dirname, '../../artifacts/findx/src/design-system/tokens');

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

let errors = [];
let warnings = [];
let tokenCount = 0;

function validateColorToken(name, value) {
  tokenCount++;
  if (!value || typeof value !== 'string') {
    errors.push(`❌ ${name}: missing or invalid value`);
    return;
  }
  if (value.startsWith('var(--')) return;
  if (!HEX_COLOR.test(value)) {
    warnings.push(`⚠️  ${name}: unusual value format "${value}"`);
  }
}

function validateSpacingToken(name, value) {
  tokenCount++;
  if (!value || typeof value !== 'string') {
    errors.push(`❌ ${name}: missing or invalid value`);
    return;
  }
  if (!value.match(/^\d+(\.\d+)?rem$/)) {
    warnings.push(`⚠️  ${name}: expected rem unit, got "${value}"`);
  }
}

function validateCategory(category, tokens, path = '') {
  for (const [key, value] of Object.entries(tokens)) {
    const tokenPath = path ? `${path}.${key}` : `${category}.${key}`;
    if (typeof value === 'object' && value !== null) {
      if (value.value) {
        const tokenValue = value.value;
        if (category === 'color') {
          validateColorToken(tokenPath, tokenValue);
        } else if (category === 'spacing' || category === 'borderRadius') {
          validateSpacingToken(tokenPath, tokenValue);
        } else {
          tokenCount++;
        }
      } else {
        validateCategory(category, value, tokenPath);
      }
    }
  }
}

function validateTokens() {
  console.log('🔍 Validating FindX Design Tokens...\n');
  
  const tokenFiles = readdirSync(TOKENS_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of tokenFiles) {
    const filePath = join(TOKENS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const tokens = JSON.parse(content);
    console.log(`📄 ${file}`);
    
    if (tokens.color) validateCategory('color', tokens.color);
    if (tokens.spacing) validateCategory('spacing', tokens.spacing);
    if (tokens.motion) validateCategory('motion', tokens.motion);
  }
  
  const foundationPath = join(__dirname, '../../artifacts/findx/src/design-system/styles/foundation.css');
  try {
    readFileSync(foundationPath, 'utf-8');
    console.log('✅ foundation.css exists\n');
  } catch {
    errors.push('❌ foundation.css not found');
  }
  
  console.log('═'.repeat(60));
  console.log(`📊 Token Count: ${tokenCount}`);
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${warnings.length}`);
    warnings.forEach(w => console.log(`  ${w}`));
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ${e}`));
    console.log('\n❌ Validation FAILED');
    process.exit(1);
  }
  
  console.log('\n✅ All tokens valid!');
}

validateTokens();