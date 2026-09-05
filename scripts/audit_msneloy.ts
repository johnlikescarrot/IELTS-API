/** Offline CLI: npm run data:source-audit -- tree.json audit.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { auditPreparationTree } from '../src/lib/preparationAudit.js';

const [input, output] = process.argv.slice(2);
if (input === undefined || output === undefined) {
  throw new Error('Usage: npm run data:source-audit -- tree.json audit.json');
}
writeFileSync(
  output,
  `${JSON.stringify(auditPreparationTree(JSON.parse(readFileSync(input, 'utf8'))), null, 2)}\n`,
);
