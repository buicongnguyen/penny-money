import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSms,parseBatch,receiptSuggestion,detectBank} from '../dist/domain.mjs';
import {isIncoming,timeParts,readInstant} from '../dist/payments.mjs';
import {reviseTransaction} from '../dist/transaction-edit.mjs';
import {createBackup,readBackup,appendTransactions} from '../dist/workspace-data.mjs';

const options={currency:'VND',date:'2026-09-28'};
test('refund wording is not a reference and separate refunds survive import',()=>{
  const messages=['17','18'].map(day=>`VCB refund 250000 VND ngay 2026-09-${day}`);
  assert.equal(parseBatch(messages,options).transactions.length,2);
  assert.equal(parseSms(messages[0],options).transaction.reference,'');
  for(const label of ['Ref: REF-1','Reference #REF-1','Mã giao dịch: REF-1','거래번호: REF-1']){
    assert.equal(parseSms(`VCB GD +100000 VND ngay 2026-09-28; ${label}`,options).transaction.reference,'REF-1');
  }
});
test('sender and first bank identifier outrank banks mentioned elsewhere',()=>{
  const text='VCB GD +250000 VND ngay 2026-09-28. ND: Shinhan buyer';
  assert.equal(detectBank(text,'VCB'),'Vietcombank');
  assert.equal(detectBank(text),'Vietcombank');
  assert.equal(detectBank('header: A+B paid 10 VND','',[{name:'Custom',keywords:['A+B']}]),'Custom');
});
test('payer, reference and memo text cannot supply transaction direction or bank timestamps',()=>{
  const t=parseSms('VCB GD +250000 VND. Nguoi gui: Hoan Tien; ND: pickup 2025-01-01 14:30; Ref: refund',options).transaction;
  assert.equal(t.type,'income');assert.equal(isIncoming(t),true);
  assert.equal(t.date,'2026-09-28');assert.equal(t.transactionTime,null);
  assert.ok(t.warnings.includes('Check date'));
});
test('transaction currency is taken from its amount, not a balance or memo',()=>{
  const t=parseSms('Shinhan paid USD 12.50 at Coffee on 2026-09-28. Balance KRW 100000',options).transaction;
  assert.ok(t);assert.equal(t.currency,'USD');assert.equal(t.amount,12.5);
  const v=parseSms('VCB GD +250000 VND ngay 2026-09-28. ND: KRW 10000 sale',options).transaction;
  assert.equal(v.currency,'VND');assert.equal(v.amount,250000);
  const receipt=receiptSuggestion('CAFE\nTotal USD 12.50\nKRW 10000',{currency:'KRW'});
  assert.equal(receipt.currency,'USD');assert.equal(receipt.amount,12.5);
});
test('yearless bank dates use the adjacent year at the SMS-arrival year boundary',()=>{
  const t=parseSms({body:'VCB GD +100000 VND ngay 31/12 23:59',receivedAt:'2027-01-01T00:00:01+07:00'},options).transaction;
  assert.equal(t.date,'2026-12-31');assert.equal(timeParts(t.transactionTime,t.timeZone).time,'23:59');
  assert.equal(timeParts(t.receivedTime,t.timeZone).date,'2027-01-01');
  assert.ok(t.timeDateAssumed);
});
test('receipt totals without currency symbols support cents and short amounts',()=>{
  for(const [text,currency,amount] of [['Total 12.50','USD',12.5],['Total 0,50','EUR',0.5],['Total 5','USD',5],['Tổng cộng 12.500','VND',12500]]){
    assert.equal(receiptSuggestion(`CAFE\n${text}`,{currency}).amount,amount);
  }
});

test('legacy false references do not suppress a different refund or duplicate a replay',()=>{
  const a='VCB refund 250000 VND ngay 2026-09-17',b=a.replace('17','18');
  const old={...parseSms(a,options).transaction,reference:'und',fingerprint:'bank-ref|vietcombank||und|VND|refund|250000'};
  assert.equal(parseBatch([a,b],options,[old]).transactions.length,1);
  assert.equal(parseBatch([a,b],options,[old]).transactions[0].date,'2026-09-18');
});
test('correcting an own transfer to income restores incoming visibility and category',()=>{
  const original=parseSms('VCB GD +100000 VND ngay 2026-09-28. ND: chuyen tien noi bo; Ref: OWN',options).transaction;
  const revised=reviseTransaction(original,{type:'income',merchant:'Buyer'});
  assert.equal(isIncoming(revised),true);assert.equal(revised.ownAccount,false);assert.equal(revised.category,'Income');
  assert.equal(revised.payer,'Buyer');assert.equal(revised.raw,original.raw);assert.equal(original.type,'transfer');
  const expense=reviseTransaction(revised,{type:'expense',merchant:'Coffee'});
  assert.equal(expense.category,'Food & drinks');assert.equal(expense.incomingTransfer,false);
});
test('date corrections survive backup with their annotation and original arrival',()=>{
  const original={...parseSms({body:'VCB GD +100000 VND ngay 2026-09-28 14:32:18.123',receivedAt:'2026-09-28T14:32:20.456+07:00'},options).transaction,id:'test'};
  const revised=reviseTransaction(original,{date:'2026-09-27'});
  const state={transactions:[revised],rules:[],demo:false,currency:'VND',month:'2026-09',budgets:{}};
  const restored=readBackup(createBackup(state)).transactions[0];
  assert.equal(restored.transactionTime.userCorrected,true);
  assert.equal(timeParts(restored.transactionTime,'Asia/Ho_Chi_Minh').date,'2026-09-27');
  assert.deepEqual(restored.receivedTime,original.receivedTime);
});
test('invalid dates remain flagged even with valid SMS metadata',()=>{
  const t=parseSms({body:'VCB GD +100000 VND ngay 2026-02-30',date:'2026-09-28'},options).transaction;
  assert.ok(t.warnings.includes('Check date'));
  assert.equal(readInstant('2200-01-01T00:00:00Z'),null);
});
test('message text alternatives and dong symbols work without relying on the selected currency',()=>{
  assert.equal(parseSms(null,options).status,'skipped');
  const t=parseSms({body:null,text:'VCB GD +100000 đ ngay 2026-09-28'},{currency:'KRW',date:'2026-09-28'}).transaction;
  assert.equal(t.currency,'VND');assert.equal(t.amount,100000);
  const header=parseSms('VCB Ref: HEADER-1 GD +100000 VND ngay 2026-09-28',options).transaction;
  assert.equal(header.reference,'HEADER-1');assert.equal(header.amount,100000);
});

test('rejected additions leave existing records valid and exportable',()=>{
  const row={id:'saved',merchant:'Coffee',bank:'Cash',date:'2026-09-28',currency:'VND',amount:10000,category:'Food & drinks',type:'expense',source:'manual',raw:'',warnings:[]};
  const state={transactions:[row],rules:[],demo:false,currency:'VND',month:'2026-09',budgets:{}};
  const before=createBackup(state,new Date('2026-09-28T00:00:00Z'));
  assert.throws(()=>appendTransactions(state,[{...row,id:'invalid',raw:'x'.repeat(100001)}]),/original text/);
  assert.equal(createBackup(state,new Date('2026-09-28T00:00:00Z')),before);
});
test('mixed-currency imports select the currency of the latest visible transaction',()=>{
  const row={id:'early',merchant:'Coffee',bank:'Cash',date:'2026-08-28',currency:'KRW',amount:10000,category:'Food & drinks',type:'expense',source:'manual',raw:'',warnings:[]};
  const next=appendTransactions({transactions:[],rules:[],demo:false,currency:'KRW',month:'2026-08',budgets:{}},[row,{...row,id:'latest',date:'2026-09-28',currency:'VND'}]);
  assert.equal(next.month,'2026-09');assert.equal(next.currency,'VND');
});
