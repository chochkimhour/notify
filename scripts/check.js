// Syntax-checks every .js file in the source folders, so new files are covered automatically.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const folders = ['api', 'lib', 'scripts', 'tests'];
const files = folders.flatMap((folder) =>
  readdirSync(folder).filter((name) => name.endsWith('.js')).map((name) => join(folder, name)),
);

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
console.log(`Checked ${files.length} files.`);
