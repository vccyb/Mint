#!/usr/bin/env npx tsx
/**
 * Quality Scorer
 *
 * Assesses code quality across dimensions:
 * - Test Coverage
 * - Documentation Completeness
 * - Architecture Compliance
 * - Security Compliance
 * - Maintainability
 *
 * Outputs a score report per dimension and overall.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../../..');

interface Score {
  dimension: string;
  weight: number;
  score: number;
  details: string;
}

function countFiles(dir: string, predicate: (name: string) => boolean): number {
  let count = 0;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      count += countFiles(fullPath, predicate);
    } else if (predicate(entry)) {
      count++;
    }
  }
  return count;
}

function scoreTestCoverage(): Score {
  const srcFiles = countFiles(join(ROOT_DIR, 'packages'), (n) => n.endsWith('.ts') && !n.endsWith('.test.ts') && !n.endsWith('.d.ts'));
  const testFiles = countFiles(join(ROOT_DIR, 'packages'), (n) => n.endsWith('.test.ts'));
  const ratio = srcFiles > 0 ? testFiles / srcFiles : 0;
  const score = Math.min(10, Math.round(ratio * 10 * 10) / 10);
  return {
    dimension: 'Test Coverage',
    weight: 0.25,
    score,
    details: `${testFiles} test files for ${srcFiles} source files (ratio: ${ratio.toFixed(2)})`,
  };
}

function scoreDocumentation(): Score {
  const docFiles = countFiles(join(ROOT_DIR, 'docs'), (n) => n.endsWith('.md'));
  const srcFiles = countFiles(join(ROOT_DIR, 'packages'), (n) => n.endsWith('.ts') && !n.endsWith('.test.ts') && !n.endsWith('.d.ts'));
  const hasAgents = readFileSync(join(ROOT_DIR, 'AGENTS.md'), 'utf-8').length > 0;
  const hasArchitecture = readFileSync(join(ROOT_DIR, 'ARCHITECTURE.md'), 'utf-8').length > 0;

  let score = 0;
  if (hasAgents) score += 2;
  if (hasArchitecture) score += 2;
  if (docFiles >= 5) score += 2;
  if (docFiles >= 10) score += 2;
  if (srcFiles > 0 && docFiles / srcFiles > 0.3) score += 2;

  return {
    dimension: 'Documentation',
    weight: 0.20,
    score: Math.min(10, score),
    details: `${docFiles} documentation files, AGENTS.md: ${hasAgents}, ARCHITECTURE.md: ${hasArchitecture}`,
  };
}

function scoreArchitectureCompliance(): Score {
  // Check if architecture docs exist and packages follow structure
  let score = 5; // Baseline for having the structure

  const requiredLayers = ['types', 'config', 'repo', 'providers', 'services', 'runtime'];
  for (const layer of requiredLayers) {
    try {
      statSync(join(ROOT_DIR, 'packages/server/src', layer));
      score += 0.5;
    } catch {
      // Layer directory doesn't exist — penalty already applied
    }
  }

  // Check if linting package exists
  try {
    statSync(join(ROOT_DIR, 'packages/linting/src/dependency-rules.ts'));
    score += 1;
  } catch {
    // No linter
  }

  return {
    dimension: 'Architecture Compliance',
    weight: 0.25,
    score: Math.min(10, score),
    details: `Layer directories and linting tools assessed`,
  };
}

function scoreSecurityCompliance(): Score {
  let score = 5;
  try {
    const securityDoc = readFileSync(join(ROOT_DIR, 'docs/SECURITY.md'), 'utf-8');
    if (securityDoc.length > 500) score += 2;
    if (securityDoc.includes('Input Validation')) score += 1;
    if (securityDoc.includes('Authentication')) score += 1;
    if (securityDoc.includes('Data Protection')) score += 1;
  } catch {
    // No security doc
  }

  return {
    dimension: 'Security Compliance',
    weight: 0.15,
    score: Math.min(10, score),
    details: `Based on SECURITY.md completeness`,
  };
}

function scoreMaintainability(): Score {
  const bigFiles: string[] = [];
  const MAX = 300;

  function walk(dir: string): void {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        const content = readFileSync(fullPath, 'utf-8');
        if (content.split('\n').length > MAX) {
          bigFiles.push(fullPath);
        }
      }
    }
  }

  walk(join(ROOT_DIR, 'packages'));

  const score = bigFiles.length === 0 ? 10 : Math.max(0, 10 - bigFiles.length * 2);
  return {
    dimension: 'Maintainability',
    weight: 0.15,
    score,
    details: bigFiles.length > 0 ? `${bigFiles.length} file(s) exceed ${MAX} lines` : 'All files within size limits',
  };
}

function getGrade(score: number): string {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 7) return 'B';
  if (score >= 6) return 'C';
  if (score >= 5) return 'D';
  return 'F';
}

function main(): void {
  const scores: Score[] = [
    scoreTestCoverage(),
    scoreDocumentation(),
    scoreArchitectureCompliance(),
    scoreSecurityCompliance(),
    scoreMaintainability(),
  ];

  const overall = scores.reduce((sum, s) => sum + s.score * s.weight, 0);

  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║              QUALITY SCORE REPORT                       ║');
  console.error('╠══════════════════════════════════════════════════════════╣');

  for (const s of scores) {
    const padded = s.dimension.padEnd(25);
    const scoreStr = s.score.toFixed(1).padStart(4);
    const weightStr = `${Math.round(s.weight * 100)}%`.padStart(3);
    console.error(`║  ${padded} ${scoreStr}/10  weight: ${weightStr}    ║`);
    console.error(`║    ${s.details.padEnd(53)}║`);
  }

  console.error('╠══════════════════════════════════════════════════════════╣');
  const grade = getGrade(overall);
  console.error(`║  OVERALL: ${overall.toFixed(1)}/10  Grade: ${grade.padEnd(36)}║`);
  console.error('╚══════════════════════════════════════════════════════════╝');

  if (overall < 7) {
    console.error('\n[quality] Score below threshold (7.0). See individual dimensions for improvement areas.');
    process.exit(1);
  }
}

main();
