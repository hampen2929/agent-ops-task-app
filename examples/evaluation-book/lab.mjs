// Deterministic grader experiment; NO model calls. Node.js >= 24.
import {mkdtemp,readFile,writeFile,copyFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url));
const base=resolve(process.argv[2]||'.');
const out=resolve(process.argv[3]||'evaluation-results');
const cases=JSON.parse(await readFile(join(here,'cases.json'),'utf8'));
const source=await readFile(join(here,'reference.ts'),'utf8');
const variants={
 correct:source,
 'anchor-drift':source.replace('nextDueDate(current, rule, anchor)','nextDueDate(current, rule)'),
 'count-off-by-one':source.replace('dates.length + 1 < rule.count','dates.length < rule.count'),
 'early-return':source.replace('  assertDate(dueDate, "dueDate");','  if (limit === 0) return [];\n  assertDate(dueDate, "dueDate");'),
 'until-exclusive':source.replace('if (next === undefined) break;','if (next === undefined || next === rule.until) break;'),
 'ignore-invalid-until':source.replace('  if (rule.until !== undefined && rule.until < dueDate) throw new Error("until precedes dueDate");',''),
 'reject-valid-zero':source.replace('limit < 0','limit <= 0'),
};
// This extra valid control probes false rejection, rather than teaching the agent another answer.
const extended=[...cases,{id:'valid-zero',split:'control',due:'2026-01-01',rule:{frequency:'daily',interval:1},limit:0,expected:[]}];
const work=await mkdtemp(join(tmpdir(),'evaluation-grader-'));
await mkdir(out,{recursive:true});
try {
 for (const name of ['types.ts','recurrence.ts']) await copyFile(join(base,'src',name),join(work,name));
 const results=[];
 const casePaths={};
 for(const [version,items] of Object.entries({v1:extended.filter(c=>c.id==='daily'),v2:extended})){
  casePaths[version]=join(work,version+'.json');
  await writeFile(casePaths[version],JSON.stringify(items));
 }
 for(const [variant,text] of Object.entries(variants)){
  const path=join(work,variant+'.ts'); await writeFile(path,text);
  for(const version of Object.keys(casePaths)){
   const casePath=casePaths[version];
   const p=spawnSync(process.execPath,[join(here,'grade.mjs'),path,casePath],{encoding:'utf8',timeout:10000});
   let grade;try{grade=JSON.parse(p.stdout)}catch(e){grade={status:'infrastructure_error',error:String(e),stderr:p.stderr,processError:String(p.error??'')}}
   results.push({variant,version,expectedAccept:variant==='correct',...grade});
  }
 }
 // A correct alternative ensures that implementation identity is not the oracle.
 const alternative=source.replace('dates.push(next);','dates[dates.length] = next;');
 const path=join(work,'alternative.ts');await writeFile(path,alternative);
 const casePath=join(work,'cases.json'); await writeFile(casePath,JSON.stringify(extended));
 const p=spawnSync(process.execPath,[join(here,'grade.mjs'),path,casePath],{encoding:'utf8',timeout:10000});
 results.push({variant:'correct-alternative',version:'v2',expectedAccept:true,...JSON.parse(p.stdout)});
 const matrix=Object.fromEntries(['v1','v2'].map(version=>{
  const rows=results.filter(r=>r.version===version);return [version,{good:rows.filter(r=>r.expectedAccept).length,bad:rows.filter(r=>!r.expectedAccept).length,falseAccept:rows.filter(r=>!r.expectedAccept&&r.status==='pass').length,falseReject:rows.filter(r=>r.expectedAccept&&r.status!=='pass').length}];
 }));
 const result={kind:'deterministic_fault_injection_not_agent_trials',node:process.version,case_sha256:createHash('sha256').update(JSON.stringify(extended)).digest('hex'),results,matrix};
 await writeFile(join(out,'grader-report.json'),JSON.stringify(result,null,2)+'\n');
 process.stdout.write(JSON.stringify(matrix,null,2)+'\n');
 if(matrix.v1.falseAccept!==6||matrix.v2.falseAccept!==0||matrix.v2.falseReject!==0)process.exitCode=1;
}finally{await rm(work,{recursive:true,force:true})}
