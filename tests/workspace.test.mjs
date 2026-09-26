import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,readBackup,mergeBackup,validateWorkspace,spendingComparison,validMonth,createWorkspaceStore} from '../dist/workspace-data.mjs';
import {BANK_RULES,demoTransactions} from '../dist/domain.mjs';
import {readInstant} from '../dist/payments.mjs';

const row=(id,extra={})=>({id,merchant:'Coffee',bank:'Shinhan',currency:'KRW',amount:6500,date:'2026-09-12',type:'expense',category:'Food & drinks',source:'manual',raw:'A note',warnings:[],...extra});
const workspace=transactions=>({transactions,rules:structuredClone(BANK_RULES),demo:false,currency:'KRW',month:'2026-09',budgets:{'2026-09:KRW':100000}});

test('backup round trip preserves original SMS, bank milliseconds and budgets',()=>{
  const data=workspace([row('credit',{source:'sms',type:'income',category:'Income',raw:'[신한은행] 입금 6,500원',transactionTime:readInstant('2026-09-12T14:32:18.123+09:00'),receivedTime:readInstant('2026-09-12T14:32:18.456+09:00'),timeZone:'Asia/Seoul',payer:'Kim',incomingTransfer:true,paymentChannel:'Facebook'})]);
  assert.deepEqual(readBackup(createBackup(data)),data);
});
test('old workspace format and demo records remain compatible',()=>{
  const data={...workspace(demoTransactions()),demo:true};delete data.budgets;
  const restored=readBackup(JSON.stringify(data));assert.equal(restored.transactions.length,38);assert.deepEqual(restored.budgets,{});
});
test('invalid amounts, duplicate IDs, malformed timestamps and versions fail before restore',()=>{
  assert.throws(()=>readBackup('{bad'),/valid JSON/);
  assert.throws(()=>readBackup(JSON.stringify({format:'penny-backup',version:99,data:workspace([])})),/version/);
  for(const invalid of [{amount:-1},{amount:12.5},{date:'2026-02-30'},{currency:'XYZ'},{merchant:null},{warnings:{}},{timeZone:'Mars/Base'},{transactionTime:{epochMs:NaN}}])assert.throws(()=>validateWorkspace(workspace([row('a',invalid)])));
  assert.throws(()=>validateWorkspace(workspace([row('same'),row('same')])));
});
test('repeat restore does not duplicate records or overwrite corrected entries and budgets',()=>{
  const current=workspace([row('same',{merchant:'Corrected name'})]);
  const backup=workspace([row('same'),row('new')]);backup.budgets['2026-09:KRW']=50000;backup.budgets['2026-09:VND']=1000000;
  const first=mergeBackup(current,backup);assert.equal(first.added,1);assert.equal(first.skipped,1);assert.equal(first.data.transactions[0].merchant,'Corrected name');
  assert.equal(first.data.budgets['2026-09:KRW'],100000);assert.equal(first.data.budgets['2026-09:VND'],1000000);
  const second=mergeBackup(first.data,backup);assert.equal(second.added,0);assert.equal(second.skipped,2);assert.equal(current.transactions.length,1);
});
test('SMS restore detects matching content with different IDs; manual duplicates are legitimate',()=>{
  const a=row('a',{source:'sms'}),b=row('b',{source:'sms'});
  assert.equal(mergeBackup(workspace([a]),workspace([b])).added,0);
  assert.equal(mergeBackup(workspace([row('a')]),workspace([row('b')])).added,1);
});
test('personal backup replaces examples, and examples cannot merge into personal records',()=>{
  const demo={...workspace([row('demo')]),demo:true};
  const restored=mergeBackup(demo,workspace([row('real')]));assert.equal(restored.replacesDemo,true);assert.equal(restored.data.demo,false);assert.equal(restored.data.transactions[0].id,'real');
  assert.throws(()=>mergeBackup(workspace([]),demo),/demo backup/);
});
test('unknown fields are discarded and bad budget keys cannot enter state',()=>{
  const data=JSON.parse(JSON.stringify(workspace([])));data.view='evil';data.__proto__={polluted:true};assert.equal(validateWorkspace(data).view,undefined);
  assert.throws(()=>validateWorkspace({...workspace([]),budgets:{'2026-13:KRW':1000}}));
  assert.throws(()=>validateWorkspace({...workspace([]),budgets:{'2026-09:VND':0.5}}));
});
test('current-month comparison uses matching days, one currency, one bank and only expenses',()=>{
  const data=[row('now',{date:'2026-09-10',amount:100}),row('prev',{date:'2026-08-10',amount:200}),row('future',{date:'2026-09-30',amount:500}),row('prev-late',{date:'2026-08-30',amount:700}),row('vn',{currency:'VND',amount:100000}),row('income',{type:'income',category:'Income',amount:9999}),row('bank',{bank:'Other',amount:2000})];
  const result=spendingComparison(data,{month:'2026-09',currency:'KRW',bank:'Shinhan',today:'2026-09-15'});
  assert.equal(result.current,100);assert.equal(result.baseline,200);assert.equal(result.percent,-50);assert.equal(result.partial,true);
});
test('comparison handles year rollover, shorter months, absent baseline and future periods',()=>{
  const rows=[row('a',{date:'2026-02-28'}),row('b',{date:'2026-03-31'})];
  const result=spendingComparison(rows,{month:'2026-03',currency:'KRW',today:'2026-03-31'});assert.equal(result.percent,0);
  assert.equal(spendingComparison([],{month:'2026-01',currency:'KRW',today:'2026-09-26'}).previous,'2025-12');
  assert.equal(spendingComparison([],{month:'2026-10',currency:'KRW',today:'2026-09-26'}).future,true);
  assert.equal(spendingComparison([],{month:'2026-09',currency:'KRW',today:'2026-09-26'}).percent,null);
  assert.equal(validMonth('2026-13'),false);
});
test('unreadable saved data survives ordinary changes until an explicit valid restore',()=>{
  let saved='{"transactions": broken';const original=saved;
  const store=createWorkspaceStore({getItem:()=>saved,setItem:(_,value)=>{saved=value;}});
  assert.equal(store.data,null);assert.equal(store.recovery,original);
  assert.throws(()=>store.save(workspace([row('a')])));assert.equal(saved,original);
  assert.throws(()=>store.save({},{restore:true}));assert.equal(saved,original);
  store.save(workspace([row('a')]),{restore:true});assert.equal(store.recovery,null);
  store.save(workspace([row('b')]));assert.equal(JSON.parse(saved).transactions[0].id,'b');
});
test('failed storage write does not clear recovery or replace persisted data',()=>{
  let saved='invalid';const store=createWorkspaceStore({getItem:()=>saved,setItem:()=>{throw new Error('Quota exceeded');}});
  assert.throws(()=>store.save(workspace([]),{restore:true}),/Quota/);assert.equal(store.recovery,'invalid');assert.equal(saved,'invalid');
});
