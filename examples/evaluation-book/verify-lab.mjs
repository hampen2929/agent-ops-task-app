import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));

test('six v2 infrastructure failures make the whole lab fail and remain unconfirmed', async()=>{
  const work=await mkdtemp(join(tmpdir(),'evaluation-lab-failure-'));
  try {
    for(const name of ['lab.mjs','grade-process.mjs','cases.json','reference.ts'])
      await copyFile(join(here,name),join(work,name));
    await mkdir(join(work,'src'));
    // The fake grader does not import artifacts; these satisfy the lab's copy step.
    for(const name of ['types.ts','recurrence.ts'])await writeFile(join(work,'src',name),'');
    await writeFile(join(work,'grade.mjs'),`
      const artifact=process.argv[2], cases=process.argv[3];
      if(cases.endsWith('v2.json')&&!artifact.endsWith('/correct.ts')) {
        process.stderr.write('simulated infrastructure failure');process.exit(2);
      }
      process.stdout.write(JSON.stringify({status:'pass',passed:1,total:1,results:[{passed:true}]}));
    `);
    const result=spawnSync(process.execPath,[join(work,'lab.mjs'),work,join(work,'output')],{encoding:'utf8',timeout:30000});
    assert.equal(result.error,undefined);
    assert.equal(result.status,1,result.stderr);
    const matrix=JSON.parse(result.stdout);
    assert.equal(matrix.v1.falseAccept,6);
    assert.equal(matrix.v2.unconfirmed,6);
    assert.equal(matrix.v2.falseAccept,0);
    assert.equal(matrix.v2.falseReject,0);
  } finally {await rm(work,{recursive:true,force:true});}
});
