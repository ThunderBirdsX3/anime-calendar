import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const parser = new Bun.Transpiler({ loader: 'js' });
let count = 0;
for (const file of new Bun.Glob('{src,public,test,scripts}/**/*.js').scanSync({ cwd: root })) {
  parser.transformSync(readFileSync(resolve(root, file), 'utf8'));
  count++;
}
console.log(`Syntax checked ${count} JavaScript files`);
