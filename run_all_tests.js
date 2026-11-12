/**
 * run_all_tests.js
 * 
 * Programmatic master runner that executes all static test_*.js suites,
 * records individual PASS / FAIL / SKIP counts, and computes exact totals.
 * (Live PostgreSQL harness is excluded and evaluated separately).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = fs.readdirSync(__dirname)
  .filter(file => file.startsWith('test_') && file.endsWith('.js') && file !== 'run_all_tests.js' && file !== 'test_local_postgresql_harness.js')
  .sort();

const results = [];
let grandTotal = 0;
let grandPassed = 0;
let grandFailed = 0;
let grandSkipped = 0;

console.log(`\n=======================================================`);
console.log(`EXECUTING ALL STATIC TEST SUITES PROGRAMMATICALLY (${testFiles.length} files)`);
console.log(`=======================================================\n`);

for (const file of testFiles) {
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    stdout = execSync(`node "${file}"`, { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    stdout = err.stdout ? err.stdout.toString() : '';
    stderr = err.stderr ? err.stderr.toString() : '';
    exitCode = err.status !== undefined ? err.status : 1;
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // 1. Summary line: e.g. "PASS: 14, FAIL: 0, SKIP: 0"
  const summaryMatch = stdout.match(/(?:PASS|Passed):\s*(\d+).*?(?:FAIL|Failed):\s*(\d+)(?:.*?(?:SKIP|Skipped):\s*(\d+))?/i);
  // 2. Fraction summary: e.g. "Passed: 10/10"
  const fractionMatch = stdout.match(/Passed:\s*(\d+)\/(\d+)/i);
  // 3. Rentals format: [TEST 1] MUVAFFAQ TARZDA O‘TDI
  const rentalPassMatch = stdout.match(/\[TEST\s*\d+\]\s*MUVAFFAQ/gi);
  const rentalFailMatch = stdout.match(/\[TEST\s*\d+\]\s*XATOLIK/gi);
  // 4. Roles format: [SINOV A] MUVAFFAQ TARZDA O‘TDI
  const rolePassMatch = stdout.match(/\[SINOV\s*[A-Z]\]\s*MUVAFFAQ/gi);
  const roleFailMatch = stdout.match(/\[SINOV\s*[A-Z]\]\s*XATOLIK/gi);

  if (summaryMatch) {
    passed = parseInt(summaryMatch[1], 10);
    failed = parseInt(summaryMatch[2], 10);
    skipped = summaryMatch[3] ? parseInt(summaryMatch[3], 10) : 0;
  } else if (fractionMatch) {
    passed = parseInt(fractionMatch[1], 10);
    const total = parseInt(fractionMatch[2], 10);
    failed = total - passed;
    skipped = 0;
  } else if (rentalPassMatch || rentalFailMatch) {
    passed = (rentalPassMatch || []).length;
    failed = (rentalFailMatch || []).length;
    skipped = 0;
  } else if (rolePassMatch || roleFailMatch) {
    passed = (rolePassMatch || []).length;
    failed = (roleFailMatch || []).length;
    skipped = 0;
  } else {
    const passLines = (stdout.match(/\[PASS\]/gi) || []).length;
    const failLines = (stdout.match(/\[FAIL\]/gi) || []).length;
    if (passLines > 0 || failLines > 0) {
      passed = passLines;
      failed = failLines;
    } else {
      passed = exitCode === 0 ? 1 : 0;
      failed = exitCode === 0 ? 0 : 1;
    }
  }

  const fileTotal = passed + failed + skipped;
  grandTotal += fileTotal;
  grandPassed += passed;
  grandFailed += failed;
  grandSkipped += skipped;

  results.push({
    file,
    total: fileTotal,
    passed,
    failed,
    skipped,
    exitCode
  });

  const statusStr = exitCode === 0 && failed === 0 ? 'PASS' : 'FAIL';
  console.log(`[${statusStr}] ${file.padEnd(35)} Total: ${String(fileTotal).padStart(2)} | Pass: ${String(passed).padStart(2)} | Fail: ${String(failed).padStart(2)} | Skip: ${String(skipped).padStart(2)}`);
}

console.log(`\n-------------------------------------------------------`);
console.log(`STATIC PROGRAMMATIC TOTAL SUMMARY:`);
console.log(`Total Files  : ${testFiles.length}`);
console.log(`Total Tests  : ${grandTotal}`);
console.log(`Total Passed : ${grandPassed}`);
console.log(`Total Failed : ${grandFailed}`);
console.log(`Total Skipped: ${grandSkipped}`);
console.log(`-------------------------------------------------------\n`);

fs.writeFileSync(path.join(__dirname, 'test_results_summary.json'), JSON.stringify({
  timestamp: new Date().toISOString(),
  grandTotal,
  grandPassed,
  grandFailed,
  grandSkipped,
  results
}, null, 2));

if (grandFailed > 0) {
  process.exit(1);
}
