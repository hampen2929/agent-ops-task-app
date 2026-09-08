import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
const [target, caseFile = new URL('./cases.json', import.meta.url).pathname] = process.argv.slice(2);
if (!target) throw new Error('usage: node grade.mjs TARGET CASES');
const cases = JSON.parse(await readFile(caseFile, 'utf8'));
let fn;
try { fn = (await import(pathToFileURL(resolve(target)))).previewDueDates; }
catch (e) { process.stdout.write(JSON.stringify({status:'invalid_artifact', error:String(e)})+'\n'); process.exit(2); }
if (typeof fn !== 'function') { process.stdout.write(JSON.stringify({status:'invalid_artifact', error:'missing export'})+'\n'); process.exit(2); }
const results = cases.map(c => {
  const rule = structuredClone(c.rule), before = structuredClone(rule);
  let actual, error;
  try { actual = fn(c.due, rule, c.limit); } catch (e) { error = String(e); }
  const passed = (c.throws ? Boolean(error) : !error && isDeepStrictEqual(actual,c.expected)) && isDeepStrictEqual(rule,before);
  return {id:c.id, split:c.split, passed, actual:actual ?? null, error:error ?? null};
});
process.stdout.write(JSON.stringify({status:results.every(r=>r.passed)?'pass':'fail',passed:results.filter(r=>r.passed).length,total:results.length,results},null,2)+'\n');
process.exitCode=results.every(r=>r.passed)?0:1;
