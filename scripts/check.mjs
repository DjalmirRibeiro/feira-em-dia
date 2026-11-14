import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = [];
for (const dir of ['.', 'server', 'scripts', 'tests']) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isFile() && /\.(mjs|js)$/.test(entry.name)) files.push(`${dir}/${entry.name}`);
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${files.length} arquivos JavaScript verificados.`);
