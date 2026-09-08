"""Explicit live experiment. Six isolated Claude Code trials, <= $1 API-equivalent budget per trial.
Run: python3 run-agents.py BASE_CHECKOUT OUTPUT_DIRECTORY --live
The cost field reported by CLI is not proof of an actual subscription charge.
"""
import hashlib, json, os, pathlib, shutil, subprocess, sys, time
lab=pathlib.Path(__file__).resolve().parent
base=pathlib.Path(sys.argv[1]).resolve(); output=pathlib.Path(sys.argv[2]).resolve()
assert sys.argv[3:]==['--live'], 'Live model execution requires --live'
output.mkdir(parents=True,exist_ok=True)
prompt=(lab/'task.md').read_text()
extra='\nBefore implementing, make a boundary checklist from the SAME contract: validation before early return, anchor preservation, count includes the supplied occurrence, inclusive until. Check those cases before reporting completion. Do not read any files outside this workspace.'
metadata={'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=base,text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'claude':subprocess.check_output(['claude','--version'],text=True).strip(),'task_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'cases_sha256':hashlib.sha256((lab/'cases.json').read_bytes()).hexdigest(),'conditions':{'A':prompt,'B':prompt+extra},'trials_per_condition':3,'per_trial_timeout_seconds':180,'max_budget_usd_per_trial':1,'order':['A1','B1','B2','A2','A3','B3'],'human_calibration':False}
(output/'experiment.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
for trial in metadata['order']:
 dest=output/trial; dest.mkdir(exist_ok=True)
 if (dest/'record.json').exists(): continue
 work=dest/'workspace'; work.mkdir(exist_ok=True)
 for n in ['src','tests']:
  shutil.copytree(base/n,work/n,dirs_exist_ok=True)
 for n in ['package.json','package-lock.json','tsconfig.json','eslint.config.js']:
  if (base/n).exists(): shutil.copy2(base/n,work/n)
 (work/'node_modules').symlink_to(base/'node_modules',target_is_directory=True)
 before={str(p.relative_to(work)):hashlib.sha256(p.read_bytes()).hexdigest() for root in ['src','tests'] for p in (work/root).rglob('*') if p.is_file()}
 command=['claude','-p','--output-format','json','--no-session-persistence','--setting-sources','','--tools','Read,Edit,Write,Bash','--allowedTools','Read','Edit','Write','Bash(npm test*)','Bash(npm run*)','--permission-mode','acceptEdits','--max-budget-usd','1']
 started=time.time()
 try:
  p=subprocess.run(command,input=metadata['conditions'][trial[0]],cwd=work,capture_output=True,text=True,timeout=180)
  raw=p.stdout; err=p.stderr; code=p.returncode; timeout=False
 except subprocess.TimeoutExpired as e:
  raw=e.stdout or b''; err=e.stderr or b''
  if isinstance(raw,bytes): raw=raw.decode(errors='replace')
  if isinstance(err,bytes): err=err.decode(errors='replace')
  code=None; timeout=True
 (dest/'response.json').write_text(raw); (dest/'stderr.txt').write_text(err)
 try: response=json.loads(raw)
 except ValueError: response={}
 changed=[name for name,digest in before.items() if not (work/name).exists() or hashlib.sha256((work/name).read_bytes()).hexdigest()!=digest]
 commands={}
 for name,args in [('grade',['node',str(lab/'grade.mjs'),str(work/'src/preview.ts')]),('typecheck',['npm','run','typecheck']),('regression',['npm','test']),('lint',['npm','run','lint'])]:
  try:
   q=subprocess.run(args,cwd=work,capture_output=True,text=True,timeout=60)
   (dest/(name+'.txt')).write_text(q.stdout+q.stderr); commands[name]=q.returncode
  except subprocess.TimeoutExpired: commands[name]=None
 record={'trial':trial,'started_at_epoch':started,'elapsed_seconds':round(time.time()-started,3),'agent_exit':code,'agent_timeout':timeout,'reported_total_cost_usd':response.get('total_cost_usd'),'usage':response.get('usage'),'model_usage':response.get('modelUsage'),'changed_protected_files':changed,'checks':commands,'accepted_by_machine':not timeout and code==0 and not response.get('is_error',False) and not changed and all(v==0 for v in commands.values())}
 (dest/'record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
 print(json.dumps(record,ensure_ascii=False),flush=True)
