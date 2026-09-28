import {categorize} from './domain.mjs';
import {correctPaymentDate} from './payments.mjs';

// Shared by import review and the transaction editor so both produce the same
// income/transfer classification without changing original SMS or arrival time.
export function reviseTransaction(original,changes){
  const next={...original,...changes,warnings:[]};
  if(next.type!=='expense')next.category=categorize(next.merchant,next.type);
  else if(['Income','Refund','Transfer'].includes(next.category))next.category=categorize(next.merchant);
  const date=next.date;next.date=original.date;
  correctPaymentDate(next,date);next.date=date;
  next.incomingTransfer=next.type==='income'&&next.source==='sms';
  next.ownAccount=next.type==='transfer';
  if(next.incomingTransfer&&next.merchant!==original.merchant)next.payer=next.merchant;
  return next;
}
