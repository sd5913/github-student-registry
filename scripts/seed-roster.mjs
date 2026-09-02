// Load a cohort's enrolled student IDs into D1.
//
//   npm run roster:seed -- 2026 --remote
//   npm run roster:seed -- 2026            (local dev database)
//
// The roster lives in `db/cohorts/<cohort>.cohort`, one `5668G` per line, and
// is git-ignored: it is student data and this repository is public. Seeding
// replaces that cohort's rows, so removing a line here removes the entry.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRoster } from '../lib/student-id.ts';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const cohort = args.find((arg) => !arg.startsWith('--'));
if (!cohort) {
  console.error('Usage: npm run roster:seed -- <cohort> [--remote]');
  process.exit(1);
}

const rosterPath = new URL(`../db/cohorts/${cohort}.cohort`, import.meta.url);
let text;
try {
  text = readFileSync(rosterPath, 'utf8');
} catch {
  console.error(`No roster file for ${cohort}. Expected db/cohorts/${cohort}.cohort`);
  process.exit(1);
}

// parseRoster rejects duplicates and malformed lines, so a bad file stops here
// rather than half-seeding the table.
const roster = parseRoster(text);
const values = [...roster].map((id) => `('${cohort}', '${id}')`).join(', ');
const sql = `DELETE FROM cohort_roster WHERE cohort = '${cohort}';\nINSERT INTO cohort_roster (cohort, student_id) VALUES ${values};\n`;

const sqlPath = join(mkdtempSync(join(tmpdir(), 'roster-')), `${cohort}.sql`);
writeFileSync(sqlPath, sql);

const wrangler = ['d1', 'execute', 'DB', '--config', 'dist/server/wrangler.json', '--file', sqlPath, remote ? '--remote' : '--local'];
if (!remote) wrangler.push('--persist-to', '.wrangler/state');
console.log(`Seeding ${roster.size} IDs for ${cohort} into the ${remote ? 'remote' : 'local'} database.`);
const result = spawnSync('npx', ['--yes', 'wrangler', ...wrangler], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
