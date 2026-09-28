import test from 'node:test';
import assert from 'node:assert/strict';
import {createMutationGuard,createLatestRequest,recognizeReceipt} from '../dist/async-actions.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('repeat submits and competing changes cannot mutate records during a pending save',async()=>{
  const save=deferred();let writes=0,busy=0,prevented=0;
  const guard=createMutationGuard(()=>busy++);
  const first=guard(async()=>{writes++;await save.promise;});
  const other=guard(async()=>{writes+=10;});
  const event={preventDefault(){prevented++;}};
  const pending=first(event);await first(event);await other(event);
  assert.equal(writes,1);assert.equal(busy,2);assert.equal(prevented,3);
  save.resolve();await pending;await other(event);assert.equal(writes,11);
});
test('failed save releases the guard for a later retry',async()=>{
  const guard=createMutationGuard();let count=0;
  const action=guard(async()=>{if(++count===1)throw new Error('failed');return 'saved';});
  await assert.rejects(action(),/failed/);assert.equal(await action(),'saved');
});
test('validation errors reach the form without an unhandled rejection',async()=>{
  let message;
  const guard=createMutationGuard(()=>{},error=>{message=error.message;});
  assert.equal(await guard(async()=>{throw new Error('Invalid transaction');})(),false);
  assert.equal(message,'Invalid transaction');
});
test('late file reads cannot overwrite a newer file, paste or closed dialog',()=>{
  const reads=createLatestRequest(),a=reads.begin(),b=reads.begin();
  assert.equal(reads.current(a),false);assert.equal(reads.current(b),true);
  reads.invalidate();assert.equal(reads.current(b),false);
});
test('OCR timeout disposes a worker that is created after the timeout',async()=>{
  const created=deferred();let terminated=0,recognized=0,progress=0,logger;
  const run=recognizeReceipt({createWorker:(_,log)=>{logger=log;return created.promise;},image:'old-photo',language:'vie+eng',timeoutMs:5,onProgress:()=>progress++});
  await assert.rejects(run,/too long/);
  created.resolve({recognize(){recognized++;return {data:{text:'stale'}};},terminate(){terminated++;}});
  await flush();logger({status:'late'});
  assert.equal(terminated,1);assert.equal(recognized,0);assert.equal(progress,0);
});
test('cancelled OCR ignores late results and does not interfere with a newer scan',async()=>{
  const result=deferred(),controller=new AbortController();let stopped=0,lateProgress;
  const run=recognizeReceipt({createWorker:async(_,log)=>{lateProgress=log;return {recognize:()=>result.promise,terminate:()=>stopped++};},image:'old-photo',signal:controller.signal,onProgress:()=>assert.fail('stale progress')});
  await flush();controller.abort();await assert.rejects(run,{name:'AbortError'});
  result.resolve({data:{text:'old'}});lateProgress({status:'late'});
  const next=await recognizeReceipt({createWorker:async()=>({recognize:async()=>({data:{text:'new'}}),terminate(){}}),image:'new-photo'});
  assert.equal(next,'new');assert.equal(stopped,1);
});
test('successful OCR returns text and releases its worker',async()=>{
  let stopped=0;
  const text=await recognizeReceipt({createWorker:async()=>({recognize:async image=>({data:{text:image}}),terminate:()=>stopped++}),image:'receipt'});
  assert.equal(text,'receipt');assert.equal(stopped,1);
});
