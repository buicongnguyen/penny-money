import {CURRENCIES,CATEGORIES,localDate,validDate} from './domain.mjs';
import {createBackup,readBackup,mergeBackup,spendingComparison} from './workspace-data.mjs';

export function initWorkspace({getState,restore,commit,changed,escape,money,icon,toast,setView,getRecovery}) {
  const $=id=>document.getElementById(id);
  const expenseCategories=CATEGORIES.filter(c=>!['Income','Refund','Transfer'].includes(c));
  const options=values=>values.map(value=>`<option value="${escape(value)}">${escape(value)}</option>`).join('');
  function dialog(id,title,body) {
    const el=document.createElement('dialog'); el.id=id; el.setAttribute('aria-labelledby',id+'-title');
    el.innerHTML=`<div class="dialog-heading"><h2 id="${id}-title">${title}</h2><button class="icon-button" aria-label="Close ${title}" type="button">×</button></div>${body}`;
    el.querySelector('.icon-button').onclick=()=>el.close(); document.body.append(el); return el;
  }
  const addButton=document.createElement('button'); addButton.id='add-transaction'; addButton.className='button primary'; addButton.innerHTML=icon('plus')+' Add transaction';
  document.querySelector('.heading-actions').prepend(addButton);
  $('import-button').classList.replace('primary','secondary');
  const tools=document.createElement('div'); tools.className='workspace-tools';
  tools.innerHTML=`<span>${icon('lock')} Private records, saved in this browser</span><button id="backup-button" class="text-button">Backup & restore</button>`;
  $('filters').before(tools);
  const undo=document.createElement('div'); undo.className='undo-banner hidden'; undo.setAttribute('role','status');
  undo.innerHTML='<span>Transaction removed.</span><button class="text-button" id="undo-delete">Undo deletion</button>';
  tools.after(undo);
  const reviewFilter=document.createElement('select');reviewFilter.id='review-filter';reviewFilter.setAttribute('aria-label','Review status');reviewFilter.innerHTML='<option value="all">All entries</option><option value="review">Needs review</option>';
  $('category-filter').after(reviewFilter);reviewFilter.onchange=()=>changed(false);

  const manual=dialog('manual-dialog','Add transaction',`<p class="dialog-description">Record a cash purchase, payment, or income without an SMS or receipt.</p><form id="manual-form"><div class="form-grid">
    <label>Type<select id="manual-type"><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="transfer">Between my accounts</option></select></label>
    <label>Currency<select id="manual-currency">${options(CURRENCIES)}</select></label>
    <label class="full-field">Name / merchant<input id="manual-merchant" maxlength="100" placeholder="Coffee, groceries, salary…" required></label>
    <label>Amount<input id="manual-amount" type="number" min="1" max="1000000000000" step="1" inputmode="decimal" required></label>
    <label>Date<input id="manual-date" type="date" required></label>
    <label>Category<select id="manual-category">${options(expenseCategories)}</select></label>
    <label>Account / paid with<input id="manual-bank" maxlength="60" value="Cash" required></label>
    <label class="full-field">Note (optional)<input id="manual-note" maxlength="300" placeholder="Anything you want to remember"></label>
    </div><p id="manual-demo-note" class="helper"></p><p id="manual-error" class="error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">Save transaction</button></div></form>`);
  function manualType(){const expense=$('manual-type').value==='expense';$('manual-category').disabled=!expense;}
  function manualCurrency(){const whole=['KRW','VND'].includes($('manual-currency').value);$('manual-amount').min=whole?'1':'0.01';$('manual-amount').step=whole?'1':'0.01';}
  $('manual-type').onchange=manualType;$('manual-currency').onchange=manualCurrency;
  addButton.onclick=()=>{
    $('manual-form').reset();$('manual-currency').value=getState().currency;$('manual-date').value=localDate();$('manual-error').textContent='';
    $('manual-demo-note').textContent=getState().demo?'Saving your first entry replaces the example transactions.':'Saved only in this browser. Transfers between your own accounts are excluded from income and spending.';
    manualType();manualCurrency();manual.showModal();$('manual-merchant').focus();
  };
  $('manual-form').onsubmit=async e=>{
    e.preventDefault();const currency=$('manual-currency').value,type=$('manual-type').value,value=Number($('manual-amount').value);
    const merchant=$('manual-merchant').value.trim(),bank=$('manual-bank').value.trim(),date=$('manual-date').value;
    if(!merchant||!bank||!validDate(date)||!Number.isFinite(value)||value<=0||value>1e12||['KRW','VND'].includes(currency)&&!Number.isInteger(value)){$('manual-error').textContent='Check the name, account, date and amount. Won and dong must be whole numbers.';return;}
    await commit([{id:crypto.randomUUID(),merchant,bank,date,currency,type,amount:value,category:type==='expense'?$('manual-category').value:({income:'Income',refund:'Refund',transfer:'Transfer'})[type],source:'manual',raw:$('manual-note').value.trim(),warnings:[],incomingTransfer:false,ownAccount:type==='transfer'}]);
    manual.close();toast('Transaction added.');
  };

  const insight=document.createElement('section'); insight.className='insight-grid'; insight.setAttribute('aria-label','Spending insights');
  insight.innerHTML=`<article class="panel budget-panel"><div class="panel-heading"><div><p class="eyebrow">PLAN YOUR MONTH</p><h2>Monthly budget</h2></div><button id="edit-budget" class="text-button">Set budget</button></div><div class="insight-body"><strong id="budget-value">Give your spending a limit</strong><p id="budget-description"></p><progress id="budget-progress" max="100" value="0" aria-label="Monthly budget used" class="hidden"></progress><p id="budget-scope" class="helper"></p></div></article>
    <article class="panel"><div class="panel-heading"><div><p class="eyebrow">A LITTLE PERSPECTIVE</p><h2>Month comparison</h2></div></div><div class="insight-body"><strong id="comparison-value"></strong><p id="comparison-detail"></p><button id="review-entries" class="text-button hidden"></button></div></article>`;
  document.querySelector('#overview-view .charts').before(insight);
  const budgetDialog=dialog('budget-dialog','Monthly budget',`<p id="budget-context" class="dialog-description"></p><form id="budget-form"><label>Spending limit<input id="budget-amount" type="number" min="1" step="1" max="1000000000000" inputmode="decimal" required></label><p class="helper">The budget covers all accounts in this currency. Expenses count toward it; income, refunds, and transfers do not.</p><p id="budget-error" class="error" role="alert"></p><div class="dialog-actions"><button class="button secondary" id="remove-budget" type="button">Remove limit</button><button class="button primary" type="submit">Save budget</button></div></form>`);
  let budgetKey;
  $('edit-budget').onclick=()=>{
    const s=getState();budgetKey=`${s.month}:${s.currency}`;
    $('budget-context').textContent=`${s.month} · ${s.currency} · All accounts`;$('budget-amount').value=s.budgets?.[budgetKey]||'';
    const whole=['KRW','VND'].includes(s.currency);$('budget-amount').step=whole?'1':'0.01';$('budget-amount').min=whole?'1':'0.01';
    $('remove-budget').classList.toggle('hidden',!s.budgets?.[budgetKey]);$('budget-error').textContent='';budgetDialog.showModal();$('budget-amount').focus();
  };
  $('budget-form').onsubmit=async e=>{
    e.preventDefault();const value=Number($('budget-amount').value),currency=budgetKey.split(':')[1];
    if(!Number.isFinite(value)||value<=0||value>1e12||['KRW','VND'].includes(currency)&&!Number.isInteger(value)){$('budget-error').textContent='Enter a positive amount. Won and dong must be whole numbers.';return;}
    getState().budgets={...getState().budgets,[budgetKey]:value};await changed();budgetDialog.close();toast('Monthly budget saved.');
  };
  $('remove-budget').onclick=async()=>{delete getState().budgets[budgetKey];await changed();budgetDialog.close();toast('Budget removed.');};
  $('review-entries').onclick=()=>{$('review-filter').value='review';$('search').value='';$('category-filter').value='all';setView('transactions');};

  function download(content,name){const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const backup=dialog('backup-dialog','Backup & restore',`<p class="dialog-description">Keep a copy of your records, or move them to another browser or phone.</p><section class="backup-section"><h3>Save a complete backup</h3><p>Includes transactions, original SMS text, bank rules, and budgets in every currency. This file contains your private records; store it somewhere you trust.</p><button id="download-backup" class="button primary">Download JSON backup</button><button id="download-recovery" class="button secondary hidden">Download original stored data</button></section><section class="backup-section"><h3>Restore a backup</h3><p>Preview first. Existing personal records and budget limits are kept; duplicate transactions are skipped. A demo workspace is replaced by the backup.</p><label for="backup-file">Choose JSON backup</label><input id="backup-file" type="file" accept=".json,application/json"><details><summary>Or paste backup JSON</summary><textarea id="backup-text" rows="5" aria-label="Backup JSON" spellcheck="false"></textarea></details><button id="preview-backup" class="button secondary">Preview restore</button><p id="backup-file-name" class="helper"></p><div id="backup-preview" class="review-summary hidden"></div><p id="backup-error" class="error" role="alert"></p><button id="restore-backup" class="button primary hidden">Restore backup</button></section>`);
  let backupSource=null,restoreCandidate=null;
  function resetPreview(){restoreCandidate=null;$('backup-preview').classList.add('hidden');$('restore-backup').classList.add('hidden');$('backup-error').textContent='';}
  $('backup-button').onclick=()=>{resetPreview();$('download-recovery').classList.toggle('hidden',!getRecovery());backup.showModal();};
  $('download-backup').onclick=()=>{try{download(createBackup(getState()),`penny-backup-${localDate()}.json`);toast('Complete backup downloaded.');}catch(err){$('backup-error').textContent=err.message;}};
  $('download-recovery').onclick=()=>download(getRecovery(),`penny-recovery-${localDate()}.json`);
  $('backup-file').onchange=async e=>{
    resetPreview();backupSource=null;const file=e.target.files[0];if(!file)return;
    try {if(file.size>20*1024*1024)throw new Error('Choose a backup smaller than 20 MB.');backupSource=await file.text();$('backup-text').value='';$('backup-file-name').textContent=file.name;}catch(err){$('backup-error').textContent=err.message;}
  };
  $('backup-text').oninput=()=>{backupSource=null;$('backup-file-name').textContent='';$('backup-file').value='';resetPreview();};
  $('preview-backup').onclick=()=>{
    resetPreview();try {
      const source=readBackup(backupSource??$('backup-text').value);const result=mergeBackup(getState(),source);restoreCandidate=source;
      $('backup-preview').textContent=`${result.added} transactions to add · ${result.skipped} duplicates skipped. ${source.rules.length} bank rules in the backup. ${result.replacesDemo?'Replaces example transactions.':'Existing edits and budget limits are kept.'}${source.demo?' This is a demo backup.':''}${getRecovery()?' Restoring will replace the unreadable stored workspace. Download the original stored data first if you need to recover it.':''}`;
      $('backup-preview').classList.remove('hidden');$('restore-backup').classList.remove('hidden');
    } catch(err){$('backup-error').textContent=err.message;}
  };
  $('restore-backup').onclick=async()=>{
    if(!restoreCandidate)return;
    try {const result=mergeBackup(getState(),restoreCandidate);await restore(result.data);resetPreview();backup.close();toast(`Restored ${result.added} transactions. ${result.skipped} duplicates skipped.`);}catch(err){$('backup-error').textContent=err.message;}
  };
  let deleted=null;
  $('undo-delete').onclick=async()=>{
    if(!deleted)return;const s=getState();
    if(s.demo!==deleted.demo){deleted=null;undo.classList.add('hidden');toast('The workspace changed; this deletion can no longer be undone.');return;}
    if(!s.transactions.some(t=>t.id===deleted.row.id))s.transactions.push(deleted.row);
    deleted=null;undo.classList.add('hidden');await changed();toast('Transaction restored.');
  };
  return {
    rememberDeleted(row){deleted={row:structuredClone(row),demo:getState().demo};undo.classList.remove('hidden');},
    render(){
      const s=getState(),limit=s.budgets?.[`${s.month}:${s.currency}`];
      const spending=s.transactions.filter(t=>t.date.startsWith(s.month)&&t.currency===s.currency&&t.type==='expense').reduce((sum,t)=>sum+t.amount,0);
      $('budget-value').textContent=limit?`${money(Math.abs(limit-spending),s.currency)} ${spending>limit?'over budget':'remaining'}`:'Give your spending a limit';
      $('budget-description').textContent=limit?`${money(spending,s.currency)} spent of ${money(limit,s.currency)}`:'Set a monthly limit to see how much you have left.';
      $('budget-scope').textContent=`${s.month} · ${s.currency} · All accounts${s.demo?' · Demo spending':''}`;
      $('budget-progress').classList.toggle('hidden',!limit);$('budget-progress').value=limit?Math.min(100,spending/limit*100):0;
      $('budget-progress').setAttribute('aria-valuetext',limit?`${Math.round(spending/limit*100)} percent used`:'No budget set');
      $('budget-progress').classList.toggle('over-budget',!!limit&&spending>limit);$('edit-budget').textContent=limit?'Edit budget':'Set budget';
      const comparison=spendingComparison(s.transactions,s);
      $('comparison-value').textContent=comparison.future?'A future month':!comparison.hasBaseline?'Build your spending history':comparison.percent===0?'Same spending as last month':`${Math.abs(comparison.percent)}% ${comparison.percent>0?'more':'less'} spending`;
      $('comparison-detail').textContent=comparison.future?'Comparison is available once this month begins.':!comparison.hasBaseline?`No recorded expenses for ${comparison.previous} in this selection. Import last month to compare.`:`${money(comparison.current,s.currency)} vs ${money(comparison.baseline,s.currency)} · ${comparison.partial?`days 1–${comparison.days} in both months`:'full calendar months'} · ${s.bank==='all'?'all accounts':s.bank}. Based on recorded expenses.`;
      const review=s.transactions.filter(t=>t.date.startsWith(s.month)&&t.currency===s.currency&&(s.bank==='all'||t.bank===s.bank)&&t.warnings?.length).length;
      $('review-entries').classList.toggle('hidden',!review);$('review-entries').textContent=`Review ${review} ${review===1?'entry':'entries'} →`;
    }
  };
}
