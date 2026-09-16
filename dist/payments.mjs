// Timestamp and incoming-payment helpers. No browser dependencies.
export const PAYMENT_ZONES = {'Asia/Seoul':'+09:00','Asia/Ho_Chi_Minh':'+07:00'};
const clean = s => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC').replace(/đ/gi,'d').toLowerCase();
const pad=n=>String(n).padStart(2,'0');
export const paymentZone=currency=>currency==='VND'?'Asia/Ho_Chi_Minh':'Asia/Seoul';
export function realDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function readInstant(value,zone='Asia/Seoul'){
  if(value==null||value==='')return null;
  if(typeof value==='number'||/^\d{13}$/.test(String(value))){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>4102444800000)return null;return {epochMs:n,precision:'millisecond',fractionDigits:3,assumedZone:false};}
  const m=String(value).trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if(!m||!realDate(m[1])||Number(m[2])>23||Number(m[3])>59||Number(m[4]||0)>59)return null;
  const offset=m[6]||PAYMENT_ZONES[zone];if(!offset)return null;
  const iso=`${m[1]}T${pad(m[2])}:${m[3]}:${m[4]||'00'}.${(m[5]||'').padEnd(3,'0')}${offset}`;
  const epochMs=Date.parse(iso);if(!Number.isFinite(epochMs))return null;
  return {epochMs,precision:m[5]?'fraction':m[4]?'second':'minute',fractionDigits:m[5]?.length||0,assumedZone:!m[6]};
}
export function timeParts(instant,zone='Asia/Seoul'){
  if(!instant||!Number.isFinite(instant.epochMs))return null;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant.epochMs)).map(p=>[p.type,p.value]));
  const milliseconds=((instant.epochMs%1000)+1000)%1000;
  const time=`${parts.hour}:${parts.minute}${instant.precision==='minute'?'':':'+parts.second}${instant.fractionDigits?'.'+String(milliseconds).padStart(3,'0').slice(0,instant.fractionDigits):''}`;
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time,hour:Number(parts.hour),minute:Number(parts.minute),second:Number(parts.second),milliseconds,millisOfDay:(Number(parts.hour)*3600+Number(parts.minute)*60+Number(parts.second))*1000+milliseconds};
}
export function precisionLabel(i){if(!i)return 'Time unavailable';if(i.precision==='minute')return 'Minute precision';if(i.precision==='second')return 'Second precision';return i.fractionDigits===3?'Millisecond precision':i.fractionDigits===2?'10 ms precision':'100 ms precision';}
export function smsTiming(message,raw,currency,fallbackDate){
  const zone=PAYMENT_ZONES[message.timeZone]?message.timeZone:paymentZone(currency);
  const receivedValue=message.receivedAt??message.timestamp??message.date;
  const receivedTime=readInstant(receivedValue,zone);
  const dateMatch=raw.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)||null;
  const vnMatch=!dateMatch&&raw.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  const receivedDate=timeParts(receivedTime,zone)?.date;
  const textDate=dateMatch?`${dateMatch[1]}-${pad(dateMatch[2])}-${pad(dateMatch[3])}`:vnMatch?`${vnMatch[3]}-${pad(vnMatch[2])}-${pad(vnMatch[1])}`:null;
  const clock=raw.match(/\b\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/);
  const baseDate=textDate||receivedDate||fallbackDate;
  const transactionTime=message.transactionAt!=null?readInstant(message.transactionAt,zone):clock?readInstant(`${baseDate}T${clock[0]}`,zone):null;
  return {timeZone:zone,transactionTime,receivedTime,timingDate:transactionTime?timeParts(transactionTime,zone).date:receivedDate||fallbackDate,invalidTimestamp:(message.transactionAt!=null||!!clock)&&!transactionTime,timeDateAssumed:!!transactionTime&&!textDate&&message.transactionAt==null};
}
export function transferFacts(raw,type){
  const s=clean(raw);
  const positive=/(?:gd|giao dich)\s*[:=]?\s*\+|\+\s*[\d.,]+\s*(?:vnd|krw|d\b)|\bcredited\b|\breceived\b|입금|ghi co|nhan tien/.test(s);
  const negative=/(?:gd|giao dich)\s*[:=]?\s*-|[-−]\s*[\d.,]+\s*(?:vnd|krw|d\b)|\bdebited\b|\bwithdraw|출금|ghi no/.test(s);
  const payerMatch=raw.match(/(?:보낸분|보낸사람|입금자|송금인|người\s*(?:gửi|chuyển)|nguoi\s*(?:gui|chuyen)|from|payer)\s*[:：]?\s*([^;\n.]+?)(?=\s+(?:ND|nội dung|noi dung|ref|memo|note|잔액|계좌|account|balance|on|at)\b|[;\n.]|$)/i);
  const reference=raw.match(/(?:ref(?:erence)?|거래번호|mã\s*(?:gd|giao dịch)|ma\s*(?:gd|giao dich))\s*[:：#]?\s*([a-z0-9_-]+)/i)?.[1]||'';
  const account=raw.match(/(?:계좌|account|\bTK)\s*[:：]?\s*([\dxX*•-]{4,30})/i)?.[1]||'';
  const memo=raw.match(/(?:메모|적요|\bND|nội dung|noi dung|memo|note)\s*[:：]\s*([^\n]+?)(?=\s*(?:;|\.)\s*(?:ref|거래번호|balance|so du|số dư)|\n|$)/i)?.[1]?.trim()||'';
  const own=/own accounts?|self transfer|본인계좌|내계좌|chuyen tien noi bo/.test(s);
  const incoming=(positive&&!negative||type==='income')&&type!=='refund';
  return {positive,negative,incomingTransfer:incoming,payer:payerMatch?.[1]?.trim().slice(0,100)||'',reference:reference.slice(0,80),account:account.slice(0,30),paymentMemo:memo.slice(0,300),paymentChannel:/\bfacebook\b|\bfb\b|페이스북/.test(s)?'Facebook':/\bdirect transfer\b/.test(s)?'Direct transfer':'Unclassified',ownAccount:own};
}
export function paymentIdentity(t){
  if(t.source==='receipt')return null;
  const raw=clean(t.raw).replace(/\s+/g,' ').trim();
  if(t.reference)return `bank-ref|${clean(t.bank)}|${clean(t.account)}|${clean(t.reference)}|${t.currency}|${t.type}|${t.amount}`;
  const clock=t.transactionTime||t.receivedTime;
  return clock?`sms-time|${clock.epochMs}|${raw}`:null;
}
export const isIncoming=t=>t.type==='income'&&t.incomingTransfer===true&&!t.ownAccount;
export function correctPaymentDate(transaction,date){
  if(transaction.date===date||!transaction.transactionTime)return;
  const parts=timeParts(transaction.transactionTime,transaction.timeZone||paymentZone(transaction.currency));
  const corrected=readInstant(`${date}T${parts.time}`,transaction.timeZone||paymentZone(transaction.currency));
  if(corrected)transaction.transactionTime={...corrected,userCorrected:true};
}
export function dayPeriod(hour){return hour==null?'Unknown':hour<6?'Night':hour<12?'Morning':hour<18?'Afternoon':'Evening';}
export function clockMillis(value){const m=String(value).match(/^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);if(!m||Number(m[1])>23||Number(m[2])>59||Number(m[3]||0)>59)return null;return (+m[1]*3600+ +m[2]*60+ +(m[3]||0))*1000+Number((m[4]||'').padEnd(3,'0'));}
export function filterPayments(transactions,{currency='VND',bank='all',month='',day='',period='all',channel='all',query='',zone='Asia/Ho_Chi_Minh',basis='transaction',from='',to='',sort='newest'}={}){
  const start=clockMillis(from),end=clockMillis(to),needle=clean(query);
  const rows=transactions.filter(isIncoming).map(t=>{const instant=basis==='received'?t.receivedTime:t.transactionTime;const parts=timeParts(instant,zone);return {transaction:t,instant,parts,date:parts?.date||t.date,period:dayPeriod(parts?.hour)};}).filter(r=>{
    const t=r.transaction;if(t.currency!==currency||bank!=='all'&&t.bank!==bank||month&&!r.date.startsWith(month)||day&&r.date!==day||period!=='all'&&r.period!==period||channel!=='all'&&t.paymentChannel!==channel)return false;
    if(needle&&!clean([t.payer,t.merchant,t.raw,t.reference,t.paymentMemo,t.account].join(' ')).includes(needle))return false;
    if(start!=null||end!=null){if(!r.parts)return false;const width=r.instant.precision==='minute'?60000:r.instant.precision==='second'?1000:10**(3-r.instant.fractionDigits);const lo=r.parts.millisOfDay,hi=lo+width-1;const a=start??0,b=end??86399999;if(a<=b){if(hi<a||lo>b)return false;}else if(hi<a&&lo>b)return false;}
    return true;
  });
  rows.sort((a,b)=>{if(!!a.instant!==!!b.instant)return a.instant?-1:1;const delta=a.instant?a.instant.epochMs-b.instant.epochMs:a.date.localeCompare(b.date);return (sort==='oldest'?delta:-delta)||String(a.transaction.id).localeCompare(String(b.transaction.id));});
  return rows;
}
export function paymentAnalysis(rows){
  const hours=Array.from({length:24},(_,hour)=>({hour,count:0,amount:0}));const periods={Night:0,Morning:0,Afternoon:0,Evening:0,Unknown:0};let total=0,precise=0;
  for(const r of rows){total+=r.transaction.amount;periods[r.period]++;if(r.parts){hours[r.parts.hour].count++;hours[r.parts.hour].amount+=r.transaction.amount;}if(r.instant?.fractionDigits===3)precise++;}
  const busiest=hours.reduce((best,h)=>h.count>best.count?h:best,{hour:null,count:0});
  return {total,count:rows.length,hours,periods,precise,busiest,unknown:periods.Unknown};
}
export function simulationMessage({payer='Nguyen Minh Anh',amount=250000,currency='VND',date,time='14:32:18.123',reference='SIM-001',memo='Facebook order FB-1042',delayMs=850}={}){
  const zone=paymentZone(currency);const instant=readInstant(`${date}T${time}`,zone);
  if(!instant||!Number.isSafeInteger(Number(amount))||amount<=0||!String(payer).trim()||!Number.isSafeInteger(Number(delayMs))||delayMs<0||delayMs>600000)throw new Error('Enter a valid date, time, payer, whole amount, and SMS delay (0–600,000 ms).');
  const safe=s=>String(s).replace(/[\n\r;]/g,' ').trim();const formatted=Number(amount).toLocaleString('en-US');
  const body=currency==='KRW'?`[신한은행] 입금 ${formatted}원\n${date} ${time}\n계좌: ***4821\n입금자: ${safe(payer)}\n메모: ${safe(memo)}\n거래번호: ${safe(reference)}`:`VCB: TK ***9218 GD +${formatted} VND ngay ${date} ${time}.\nNguoi gui: ${safe(payer)}; ND: ${safe(memo)}; Ref: ${safe(reference)}. So du: 8,500,000 VND.`;
  return {body,sender:currency==='KRW'?'신한은행':'VCB',receivedAt:instant.epochMs+Number(delayMs),timeZone:zone,simulation:true};
}
