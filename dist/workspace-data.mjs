import {CURRENCIES,CATEGORIES,validDate,localDate,transactionKeys} from './domain.mjs';

export const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && validDate(value+'-01');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value,max) => typeof value === 'string' && value.length <= max;
const amount = (value,currency) => Number.isFinite(value) && value > 0 && value <= 1e12 && (!['KRW','VND'].includes(currency) || Number.isInteger(value));
function requireValue(ok,message) { if(!ok) throw new Error(message); }

// Only known fields enter the workspace. Backup content never becomes executable HTML.
export function validateWorkspace(data) {
  requireValue(object(data),'The file does not contain a Penny workspace.');
  requireValue(Array.isArray(data.transactions) && data.transactions.length <= 50000,'Invalid transaction list (maximum 50,000).');
  requireValue(Array.isArray(data.rules) && data.rules.length <= 500,'Invalid bank rules.');
  requireValue(typeof data.demo === 'boolean' && CURRENCIES.includes(data.currency) && validMonth(data.month),'Invalid workspace settings.');
  const ids = new Set();
  const transactions = data.transactions.map((t,index) => {
    requireValue(object(t),`Invalid transaction ${index+1}.`);
    requireValue(text(t.id,150) && t.id && !ids.has(t.id),'Missing or repeated transaction ID.');
    ids.add(t.id);
    requireValue(text(t.merchant,100) && t.merchant.trim() && text(t.bank,60) && t.bank.trim(),`Missing merchant or bank in transaction ${index+1}.`);
    requireValue(CURRENCIES.includes(t.currency) && amount(t.amount,t.currency) && validDate(t.date),'Invalid amount, currency, or transaction date.');
    requireValue(['expense','income','refund','transfer'].includes(t.type) && CATEGORIES.includes(t.category),'Invalid transaction type or category.');
    requireValue(['sms','receipt','manual'].includes(t.source) && text(t.raw,100000),'Invalid transaction source or original text.');
    requireValue(t.warnings === undefined || Array.isArray(t.warnings) && t.warnings.length <= 50 && t.warnings.every(w=>text(w,500)),'Invalid review warnings.');
    const row = Object.fromEntries(['id','merchant','bank','currency','amount','date','type','category','source','raw'].map(k=>[k,t[k]]));
    row.warnings = t.warnings ? [...t.warnings] : [];
    for(const key of ['fingerprint','payer','reference','account','paymentMemo','paymentChannel','timeZone','timingDate']) {
      if(t[key] !== undefined) { requireValue(text(t[key],key==='fingerprint'?200000:500),`Invalid ${key}.`); row[key]=t[key]; }
    }
    if(row.timeZone) requireValue(['Asia/Seoul','Asia/Ho_Chi_Minh'].includes(row.timeZone),'Unsupported time zone.');
    if(row.paymentChannel) requireValue(['Facebook','Direct transfer','Unclassified'].includes(row.paymentChannel),'Unsupported payment channel.');
    for(const key of ['incomingTransfer','ownAccount','invalidTimestamp','timeDateAssumed']) {
      if(t[key] !== undefined) { requireValue(typeof t[key] === 'boolean',`Invalid ${key}.`); row[key]=t[key]; }
    }
    for(const key of ['transactionTime','receivedTime']) {
      if(t[key] == null) { if(t[key]===null) row[key]=null; continue; }
      const stamp=t[key];
      requireValue(object(stamp) && Number.isSafeInteger(stamp.epochMs) && stamp.epochMs>=0 && stamp.epochMs<=4102444800000 && ['minute','second','fraction','millisecond'].includes(stamp.precision) && Number.isInteger(stamp.fractionDigits) && stamp.fractionDigits>=0 && stamp.fractionDigits<=3 && typeof stamp.assumedZone==='boolean','Invalid payment timestamp.');
      requireValue(stamp.precision==='fraction'?stamp.fractionDigits>=1:stamp.fractionDigits===(stamp.precision==='millisecond'?3:0),'Timestamp precision does not match its digits.');
      row[key]={epochMs:stamp.epochMs,precision:stamp.precision,fractionDigits:stamp.fractionDigits,assumedZone:stamp.assumedZone};
      if(stamp.userCorrected!==undefined){requireValue(typeof stamp.userCorrected==='boolean','Invalid payment timestamp.');row[key].userCorrected=stamp.userCorrected;}
    }
    return row;
  });
  const rules=data.rules.map(r=>{
    requireValue(object(r) && text(r.name,60) && r.name.trim() && Array.isArray(r.keywords) && r.keywords.length>0 && r.keywords.length<=200 && r.keywords.every(k=>text(k,250)&&k.trim()),'Invalid bank rule.');
    return {name:r.name,keywords:[...r.keywords]};
  });
  const budgets={};
  requireValue(data.budgets===undefined || object(data.budgets),'Invalid budgets.');
  for(const [key,value] of Object.entries(data.budgets||{})) {
    const [month,currency,...extra]=key.split(':');
    requireValue(!extra.length && validMonth(month) && CURRENCIES.includes(currency) && amount(value,currency),'Invalid monthly budget.');
    budgets[key]=value;
  }
  return {transactions,rules,demo:data.demo,currency:data.currency,month:data.month,budgets};
}

export function createBackup(state,now=new Date()) {
  return JSON.stringify({format:'penny-backup',version:1,exportedAt:now.toISOString(),data:validateWorkspace(state)},null,2);
}
// Validate additions before replacing the editable workspace. A rejected import
// must leave existing records usable and exportable, including temporary records.
export function appendTransactions(state,rows){
  requireValue(Array.isArray(rows)&&rows.length>0,'Select at least one transaction.');
  const latest=[...rows].sort((a,b)=>b.date.localeCompare(a.date))[0];
  return validateWorkspace({...state,transactions:[...(state.demo?[]:state.transactions),...rows],demo:false,month:latest.date.slice(0,7),currency:latest.currency});
}
export function readBackup(content) {
  requireValue(typeof content==='string' && content.length<=20*1024*1024,'Choose a backup smaller than 20 MB.');
  let parsed; try { parsed=JSON.parse(content); } catch { throw new Error('This is not valid JSON. Choose a Penny JSON backup.'); }
  if(parsed?.format==='penny-backup') {
    requireValue(parsed.version===1,'This backup version is not supported.');
    return validateWorkspace(parsed.data);
  }
  // Also accepts an exported copy of the original penny.local.v1 data.
  return validateWorkspace(parsed);
}
export const WORKSPACE_CONFLICT='Another tab changed your records. Download a JSON backup of any unsaved changes in this tab, then reload to use the latest saved records.';
export function createWorkspaceStore(storage,key='penny.local.v1',locks=null) {
  let data=null,recovery=null,blocked=false,error=null,snapshot=null;
  try {snapshot=storage.getItem(key);if(snapshot){recovery=snapshot;data=validateWorkspace(JSON.parse(snapshot));recovery=null;}}
  catch {blocked=true;error='Saved data could not be loaded. Changes are temporary; the original data is protected. Use Backup & restore to download it or restore a valid backup.';}
  function save(state,{restore=false}={}) {
    if(blocked&&!restore)throw new Error(error);
    const next=validateWorkspace(state);
    if(storage.getItem(key)!==snapshot)throw Object.assign(new Error(WORKSPACE_CONFLICT),{code:'WORKSPACE_CONFLICT'});
    const serialized=JSON.stringify(next);
    storage.setItem(key,serialized);snapshot=serialized;
    if(restore){blocked=false;recovery=null;error=null;}
    return next;
  }
  return {
    data,error,
    get recovery(){return recovery;},
    isStale(){return storage.getItem(key)!==snapshot;},
    save,
    async saveLocked(state,options) {
      if(!locks?.request)throw new Error('This browser cannot safely save across tabs. Use an updated browser over HTTPS, or download a JSON backup of your temporary changes.');
      const next=validateWorkspace(state);
      // Serialize the compare-and-write across tabs; retain each queued local edit.
      return locks.request(key+':write',()=>save(next,options));
    }
  };
}
export function mergeBackup(current,incoming) {
  const target=validateWorkspace(current), source=validateWorkspace(incoming);
  if(target.demo) return {data:source,added:source.transactions.length,skipped:0,replacesDemo:true};
  requireValue(!source.demo,'A demo backup cannot be merged into your personal records.');
  const ids=new Set(target.transactions.map(t=>t.id));
  const keys=new Set(target.transactions.filter(t=>t.source!=='manual').flatMap(transactionKeys));
  const added=[];
  for(const t of source.transactions) {
    const identities=t.source==='manual'?[]:transactionKeys(t);
    if(ids.has(t.id)||identities.some(k=>keys.has(k))) continue;
    ids.add(t.id); identities.forEach(k=>keys.add(k)); added.push(t);
  }
  const rules=structuredClone(target.rules);
  for(const rule of source.rules) {
    const existing=rules.find(r=>r.name.toLowerCase()===rule.name.toLowerCase());
    if(existing) existing.keywords=[...new Set([...existing.keywords,...rule.keywords])]; else rules.push(rule);
  }
  return {data:validateWorkspace({...target,transactions:[...target.transactions,...added],rules,budgets:{...source.budgets,...target.budgets}}),added:added.length,skipped:source.transactions.length-added.length,replacesDemo:false};
}

export function spendingComparison(transactions,{month,currency,bank='all',today=localDate()}) {
  requireValue(validMonth(month) && validDate(today),'Invalid comparison date.');
  const prior=new Date(month+'-01T12:00:00'); prior.setMonth(prior.getMonth()-1);
  const previous=localDate(prior).slice(0,7);
  const currentMonth=today.slice(0,7);
  const days=month===currentMonth?Number(today.slice(8)):31;
  const select=m=>transactions.filter(t=>t.type==='expense'&&t.currency===currency&&(bank==='all'||t.bank===bank)&&t.date.startsWith(m)&&Number(t.date.slice(8))<=days);
  const current=select(month), baseline=select(previous);
  const total=rows=>rows.reduce((sum,t)=>sum+t.amount,0);
  const value=total(current), before=total(baseline);
  return {previous,current:value,baseline:before,hasBaseline:baseline.length>0,partial:month===currentMonth,days,future:month>currentMonth,percent:before?Math.round((value-before)/before*100):null};
}
