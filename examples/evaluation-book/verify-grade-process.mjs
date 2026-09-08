import test from 'node:test';
import assert from 'node:assert/strict';
import {readGradeProcess} from './grade-process.mjs';
const result = pass => ({status:pass ? 0 : 1,signal:null,stdout:JSON.stringify({status:pass?'pass':'fail',passed:pass?1:0,total:1,results:[{passed:pass}]})});
test('completed pass and fail remain distinct classifications',()=>{
  for(const pass of [true,false])assert.equal(readGradeProcess(result(pass)).status,pass?'pass':'fail');
});
test('process failure and timeout cannot count as a correct rejection',()=>{
  for(const change of [{status:2},{status:null,signal:'SIGTERM'},{error:new Error('timeout')}])
    assert.equal(readGradeProcess({...result(false),...change}).status,'infrastructure_error');
});
test('broken JSON, empty cases and inconsistent counts remain unconfirmed',()=>{
  for(const stdout of ['broken','null','{}',JSON.stringify({status:'pass',passed:0,total:0,results:[]}),JSON.stringify({status:'fail',passed:0,total:2,results:[{passed:false}]})])
    assert.equal(readGradeProcess({...result(false),stdout}).status,'infrastructure_error');
});
test('contradictory exit cannot use a plausible result',()=>{
  assert.equal(readGradeProcess({...result(false),status:0}).status,'infrastructure_error');
});
