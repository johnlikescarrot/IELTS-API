import { isEntryPoint } from '../src/lib/cli.js';
import { runPracticeExtraction } from '../src/lib/practice-cli.js';

runPracticeExtraction(process.argv.slice(2), isEntryPoint(import.meta.url, process.argv[1]));
