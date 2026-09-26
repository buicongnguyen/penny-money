// Regression cases reproduced during the review of commit 77d75d7.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSms,parseBatch,summarize,fingerprint} from '../dist/domain.mjs';
import {createWorkspaceStore,mergeBackup,createBackup,readBackup} from '../dist/workspace-data.mjs';
import {timeParts} from '../dist/payments.mjs';

const options={date:'2026-09-26',currency:'KRW'};

test('historical month/day in a Korean SMS survives clock extraction',()=>{
  const body='[신한카드] 승인\n08/31 12:35\n12,500원\n스타벅스 강남\n일시불';
  assert.equal(parseSms(body,options).transaction.date,'2026-08-31');
});

test('date-only import metadata supplies the date for a bank clock',()=>{
  const message={date:'2026-08-31',body:'[신한카드] 승인\n12:35\n12,500원\n스타벅스 강남\n일시불'};
  assert.equal(parseSms(message,options).transaction.date,'2026-08-31');
});

test('separate arrivals with a minute-only bank clock are not silently discarded',()=>{
  const body='VCB: GD +250000 VND ngay 2026-09-17 14:32. Nguoi gui: Nguyen An';
  const messages=[{body,receivedAt:'2026-09-17T14:32:10.123+07:00'},{body,receivedAt:'2026-09-17T14:32:45.987+07:00'}];
  assert.equal(parseBatch(messages,options).transactions.length,2);
});

test('an outgoing buyer refund remains money out despite refund wording',()=>{
  const body='VCB: GD -250000 VND ngay 2026-09-17 14:32:18.123. ND: refund Facebook order FB-001; Ref: OUT-001';
  const transaction=parseSms(body,options).transaction;
  assert.equal(summarize([transaction],{currency:'VND'}).net,-250000);
});

test('a stale tab cannot overwrite a transaction saved by another tab',()=>{
  const base={transactions:[],rules:[],demo:false,currency:'KRW',month:'2026-09',budgets:{}};
  let saved=JSON.stringify(base);
  const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
  const tabA=createWorkspaceStore(storage),tabB=createWorkspaceStore(storage);
  tabA.data.transactions.push({id:'purchase',merchant:'Coffee',bank:'Cash',date:'2026-09-17',currency:'KRW',amount:6500,category:'Food & drinks',type:'expense',source:'manual',raw:'',warnings:[]});
  tabA.save(tabA.data);
  tabB.data.currency='VND';
  try {tabB.save(tabB.data);} catch { /* Rejecting a stale write is acceptable. */ }
  assert.equal(JSON.parse(saved).transactions.length,1);
});

test('coarse second/fraction times retain distinct arrivals and dedup exact repeat delivery',()=>{
  for(const clock of ['14:32:18','14:32:18.1','14:32:18.12']){
    const body=`VCB: GD +250000 VND ngay 2026-09-17 ${clock}. Nguoi gui: Nguyen An`;
    const a={body,receivedAt:'2026-09-17T14:32:18.123+07:00'},b={body,receivedAt:'2026-09-17T14:32:18.987+07:00'};
    const result=parseBatch([a,b,a],options);
    assert.equal(result.transactions.length,2);assert.equal(result.skipped.length,1);
    assert.ok(result.transactions.every(t=>t.warnings.some(w=>w.includes('separate payments'))));
    assert.equal(parseBatch([a,b],options,result.transactions).transactions.length,0);
  }
});

test('precise bank milliseconds and bank references still dedup delayed notifications',()=>{
  for(const body of ['VCB: GD +250000 VND ngay 2026-09-17 14:32:18.123.','VCB: GD +250000 VND ngay 2026-09-17 14:32. Ref: BANK-1']){
    const result=parseBatch([{body,receivedAt:1789622400123},{body,receivedAt:1789622400987}],options);
    assert.equal(result.transactions.length,1);
  }
});

test('old coarse fingerprints cannot collapse distinct arrivals during import or restore',()=>{
  const body='VCB: GD +250000 VND ngay 2026-09-17 14:32. Nguoi gui: Nguyen An';
  const a=parseSms({body,receivedAt:1789622400123},options).transaction;
  const b=parseSms({body,receivedAt:1789622400987},options).transaction;
  a.id='a';b.id='b';
  const legacy=`sms-time|${a.transactionTime.epochMs}|${body.toLowerCase()}`;
  a.fingerprint=legacy;b.fingerprint=legacy;
  const state=transactions=>({transactions,rules:[],demo:false,currency:'VND',month:'2026-09',budgets:{}});
  const restored=mergeBackup(state([a]),readBackup(createBackup(state([b]))));
  assert.equal(restored.added,1);assert.equal(mergeBackup(restored.data,state([b])).added,0);
  assert.equal(parseBatch([{body,receivedAt:1789622400987}],options,[a]).transactions.length,1);
  assert.equal(parseBatch([{body,receivedAt:1789622400123}],options,[a]).transactions.length,0);
  assert.notEqual(fingerprint(a),fingerprint(b));
});

test('bank direction ignores conflicting words in memo fields',()=>{
  for(const memo of ['refund received','hoan tien ghi co','입금 환불']){
    const t=parseSms(`VCB: GD -250000 VND ngay 2026-09-17. ND: ${memo}; Ref: OUT-1`,options).transaction;
    assert.equal(t.type,'expense');assert.equal(t.incomingTransfer,false);
  }
  const credit=parseSms('VCB: GD +250000 VND ngay 2026-09-17. ND: debited refund Facebook order; Ref: IN-1',options).transaction;
  assert.equal(credit.type,'income');assert.equal(credit.incomingTransfer,true);
});

test('bank refunds and card cancellations remain inflows and conflicting signals need review',()=>{
  for(const body of ['[신한카드] 승인취소 12,500원 2026-09-17','VCB credited refund 250000 VND ngay 2026-09-17']){
    const t=parseSms(body,options).transaction;assert.equal(t.type,'refund');
    assert.ok(summarize([t],{currency:t.currency}).moneyIn>0);
  }
  const t=parseSms('VCB: GD -250000 VND credited ngay 2026-09-17',options).transaction;
  assert.ok(t.warnings.includes('Check transaction type'));
});

test('historical short dates retain bank day across midnight SMS arrival',()=>{
  const t=parseSms({body:'[신한카드] 승인\n08/31 23:59\n12,500원\n스타벅스 강남',receivedAt:'2026-09-01T00:00:01.123+09:00'},options).transaction;
  assert.equal(t.date,'2026-08-31');assert.equal(timeParts(t.transactionTime,t.timeZone).time,'23:59');
  assert.equal(timeParts(t.receivedTime,t.timeZone).date,'2026-09-01');
  assert.ok(t.timeDateAssumed);
});

test('Vietnamese partial dates use day/month and invalid calendar dates never acquire a clock',()=>{
  const t=parseSms('VCB: GD +250000 VND ngay 31/08 14:32',options).transaction;
  assert.equal(t.date,'2026-08-31');
  const invalid=parseSms('[신한카드] 승인 12,500원 02/30 12:35',options).transaction;
  assert.equal(invalid.transactionTime,null);assert.equal(invalid.invalidTimestamp,true);
});

const workspace=transactions=>({transactions,rules:[],demo:false,currency:'KRW',month:'2026-09',budgets:{}});
const purchase=id=>({id,merchant:'Coffee',bank:'Cash',date:'2026-09-17',currency:'KRW',amount:6500,category:'Food & drinks',type:'expense',source:'manual',raw:'',warnings:[]});
function sharedStorage(initial){let saved=JSON.stringify(initial);return {getItem:()=>saved,setItem:(_,value)=>{saved=value;}};}
function lockQueue(){let tail=Promise.resolve();return {request(name,callback){assert.equal(name,'penny.local.v1:write');const result=tail.then(callback);tail=result.catch(()=>{});return result;}};}

test('serialized competing tab saves reject the stale snapshot without losing the winner',async()=>{
  const storage=sharedStorage(workspace([])),locks=lockQueue();
  const a=createWorkspaceStore(storage,undefined,locks),b=createWorkspaceStore(storage,undefined,locks);
  const results=await Promise.allSettled([a.saveLocked(workspace([purchase('a')])),b.saveLocked(workspace([purchase('b')]))]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
  assert.equal(results[1].reason.code,'WORKSPACE_CONFLICT');assert.equal(b.isStale(),true);
  assert.deepEqual(JSON.parse(storage.getItem()).transactions.map(t=>t.id),['a']);
});

test('queued saves from the same tab preserve each captured edit',async()=>{
  const storage=sharedStorage(workspace([])),store=createWorkspaceStore(storage,undefined,lockQueue());
  const state=workspace([purchase('a')]);const first=store.saveLocked(state);
  state.transactions.push(purchase('b'));const second=store.saveLocked(state);
  assert.equal((await first).transactions.length,1);assert.equal((await second).transactions.length,2);
  assert.equal(JSON.parse(storage.getItem()).transactions.length,2);
});

test('stale restores cannot overwrite new edits or resurrect deleted entries',()=>{
  const storage=sharedStorage(workspace([purchase('a')]));
  const a=createWorkspaceStore(storage),b=createWorkspaceStore(storage);
  a.save(workspace([]));
  assert.throws(()=>b.save(b.data,{restore:true}),{code:'WORKSPACE_CONFLICT'});
  assert.equal(JSON.parse(storage.getItem()).transactions.length,0);
});

test('missing cross-tab locks leave storage untouched and allow a temporary backup',async()=>{
  const storage=sharedStorage(workspace([])),store=createWorkspaceStore(storage);
  await assert.rejects(store.saveLocked(workspace([purchase('a')])),/cannot safely save/);
  assert.equal(JSON.parse(storage.getItem()).transactions.length,0);
  assert.equal(readBackup(createBackup(workspace([purchase('a')]))).transactions.length,1);
});
