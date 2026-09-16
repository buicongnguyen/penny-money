import {smsTiming,transferFacts,paymentIdentity,timeParts} from './payments.mjs';
export const CURRENCIES = ['KRW', 'VND', 'USD', 'EUR', 'GBP', 'INR', 'SGD', 'AUD'];
export const CATEGORIES = ['Food & drinks', 'Groceries', 'Shopping', 'Transport', 'Bills & home', 'Health', 'Entertainment', 'Travel', 'Other', 'Income', 'Refund', 'Transfer'];
export const BANK_RULES = [
  {name:'Shinhan',keywords:['신한','SHINHAN']}, {name:'KB Kookmin',keywords:['국민','KB국민','KB KOOKMIN','KB CARD']},
  {name:'Hana',keywords:['하나','HANA']}, {name:'Woori',keywords:['우리','WOORI']}, {name:'NH Nonghyup',keywords:['농협','NONGHYUP','NH CARD']},
  {name:'KakaoBank',keywords:['카카오뱅크','KAKAOBANK']}, {name:'Toss Bank',keywords:['토스뱅크','TOSSBANK']},
  {name:'Samsung Card',keywords:['삼성카드','SAMSUNG CARD']}, {name:'Hyundai Card',keywords:['현대카드','HYUNDAI CARD']},
  {name:'Vietcombank',keywords:['VIETCOMBANK','VCB']}, {name:'Techcombank',keywords:['TECHCOMBANK','TCB']},
  {name:'BIDV',keywords:['BIDV']}, {name:'VietinBank',keywords:['VIETINBANK','CTG']}, {name:'MB Bank',keywords:['MBBANK','MB BANK']},
  {name:'ACB',keywords:['ACB']}, {name:'VPBank',keywords:['VPBANK']}, {name:'TPBank',keywords:['TPBANK']}, {name:'Sacombank',keywords:['SACOMBANK']}
];
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export const localDate = (date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function validDate(value) {if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;}
export function parseAmount(value,currency='KRW'){
  let n=String(value).replace(/[^\d.,]/g,'');
  if(!n)return null;
  if(['KRW','VND'].includes(currency)) {if(!/^\d+(?:[.,]\d{3})*$/.test(n))return null;n=n.replace(/[.,]/g,'');}
  else if(n.includes(',')&&n.includes('.')) n=n.lastIndexOf(',')>n.lastIndexOf('.')?n.replace(/\./g,'').replace(',','.'):n.replace(/,/g,'');
  else if(/^\d{1,3}(?:[.,]\d{3})+$/.test(n))n=n.replace(/[.,]/g,'');
  else n=n.replace(',','.');
  const v=Number(n);return Number.isFinite(v)&&v>0&&v<=1e12?v:null;
}
export function detectCurrency(text,fallback='KRW'){
  if(/(?:KRW|₩|\d\s*원)/i.test(text))return 'KRW';
  if(/(?:VND|VNĐ|₫|\d\s*(?:đ|dong|đồng)\b)/i.test(text))return 'VND';
  for(const c of CURRENCIES)if(new RegExp(`\\b${c}\\b`,'i').test(text))return c;
  if(text.includes('€'))return 'EUR';if(text.includes('£'))return 'GBP';if(text.includes('₹'))return 'INR';if(text.includes('$'))return ['SGD','AUD'].includes(fallback)?fallback:'USD';
  return fallback;
}
export function extractAmounts(text,currency){
  const result=[];
  const rx=/(?:KRW|VND|VNĐ|USD|EUR|GBP|INR|SGD|AUD|₩|₫|\$|€|£|₹)\s*([+-]?\d[\d.,]*)|([+-]?\d[\d.,]*)\s*(?:KRW|VND|VNĐ|USD|EUR|GBP|INR|SGD|AUD|원|₫|đồng|dong|đ)(?![a-z])/gi;
  for(const m of text.matchAll(rx)){const amount=parseAmount(m[1]||m[2],currency);if(amount){const before=normalize(text.slice(Math.max(0,m.index-24),m.index));const balance=/(?:balance|bal\.?|so du|sd|잔액|누적|han muc)\s*[:=]?\s*$/.test(before);result.push({amount,index:m.index,raw:m[0],balance});}}
  return result;
}
export function detectDate(text,fallback=localDate()){
  let m=text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if(m){const value=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;return {date:validDate(value)?value:fallback,inferred:!validDate(value)};}
  m=text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if(m){const value=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return {date:validDate(value)?value:fallback,inferred:!validDate(value)};}
  m=text.match(/(?:^|\s)(\d{1,2})[/.](\d{1,2})(?:\s|$)/);
  if(m){const value=`${fallback.slice(0,4)}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;if(validDate(value))return {date:value,inferred:true};}
  return {date:fallback,inferred:true};
}
export function categorize(text,type='expense'){
  if(type==='income')return 'Income';if(type==='refund')return 'Refund';if(type==='transfer')return 'Transfer';
  const s=normalize(text);const groups=[
    ['Groceries',/emart|e-mart|이마트|홈플러스|롯데마트|lotte mart|winmart|coopmart|co\.op|big c|grocery|groceries|supermarket|cu편의점|gs25|7-eleven/],
    ['Food & drinks',/starbucks|스타벅스|카페|커피|식당|김밥|배달|coffee|cafe|restaurant|highlands|phuc long|pizza|mcdonald|baemin|배민|pho |bistro|burger|food|dining/],
    ['Transport',/taxi|택시|교통|지하철|주유|kakao t|카카오t|grab|uber|metro|bus|petrol|parking|t-money/],
    ['Bills & home',/rent|임대|월세|전기|가스|통신|관리비|internet|electric|water bill|evn|viettel|mobifone|skt|kt통신/],
    ['Health',/약국|병원|의원|pharmacy|hospital|clinic|nha thuoc|long chau|pharmacity/],
    ['Entertainment',/netflix|spotify|cinema|cgv|영화|disney|youtube/],
    ['Travel',/hotel|airbnb|airline|항공|호텔|booking|vietjet/],
    ['Shopping',/coupang|쿠팡|다이소|daiso|shopee|lazada|tiki|uniqlo|무신사|musinsa|shopping|store|amazon/]
  ];return groups.find(([,rx])=>rx.test(s))?.[0]||'Other';
}
export function detectBank(text,sender='',rules=BANK_RULES){const hay=normalize(sender+' '+text);return rules.find(r=>r.keywords.some(k=>{const v=normalize(k);if(!v)return false;return /^[a-z0-9 ]+$/.test(v)?new RegExp(`(^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z0-9]|$)`).test(hay):hay.includes(v);} ))?.name||'Unknown bank';}
function merchantName(text,bank){
  let m=text.match(/(?:\bat\b|\btai\b|\btại\b|가맹점\s*[:：]?|사용처\s*[:：]?|merchant\s*[:：]?)\s+(.+?)(?=\s+(?:on|ngay|ngày|luc|lúc|balance|bal|card|ref|잔액)\b|[.;\n]|$)/i);
  if(m)return m[1].trim().slice(0,80);
  const lines=text.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const candidate=lines.find(l=>!/(?:원|₩|KRW|VND|web발신|승인|취소|잔액|\d{2}[:/.-]\d{2}|\*|누적|일시불|카드|님)/i.test(l)&&l!==bank&&!/^(신한|국민|우리|하나|농협)$/.test(l));
  if(candidate&&candidate.length<65&&lines.length>2)return candidate;
  m=text.match(/(?:ND|noi dung|nội dung)\s*[:：]\s*(.+?)(?=\s+(?:SD|so du|số dư)\s*[:：]|$)/i);
  if(m)return m[1].trim().replace(/[.;]$/,'').slice(0,80);
  return 'Unidentified transaction';
}
export const fingerprint=t=>paymentIdentity(t)||`${t.source||'sms'}|${t.date}|${normalize(t.raw).replace(/\s+/g,' ').trim()}`;
export function parseSms(message,{currency='KRW',date=localDate(),rules=BANK_RULES}={}){
  const obj=typeof message==='string'?{body:message}:message;
  const raw=String(obj.body??obj.text??obj.message??'').trim(); const s=normalize(raw);
  const skip=reason=>({status:'skipped',reason,raw});
  if(!raw)return skip('Empty message');
  if(/\botp\b|one.time.password|verification code|인증번호|인증코드|ma xac (?:thuc|nhan)|ma otp/.test(s))return skip('Verification code');
  if(/\bdeclined\b|\bfailed\b|승인거절|잔액부족|that bai|khong thanh cong/.test(s))return skip('Failed transaction');
  if(/\(광고\)|\[광고\]|khuyen mai|promotion|pre.approved|credit limit|han muc|payment due|thanh toan toi thieu|결제예정|청구예정/.test(s))return skip('Promotion or payment reminder');
  const bank=detectBank(raw,String(obj.sender??obj.address??''),rules);
  const cur=detectCurrency(raw,currency);
  const amounts=extractAmounts(raw,cur).filter(a=>!a.balance);
  const expense=/spent|debited|purchase|paid|withdraw|payment of|승인|출금|결제|이체|thanh toan|rut tien|ghi no|gd\s*[:=]?\s*-|[−-]\s*[\d.,]+\s*(?:vnd|d|dong)|chuyen (?:khoan|tien)/.test(s);
  const income=/credited|received|deposit|salary|입금|급여|ghi co|nhan tien|gd\s*[:=]?\s*\+|\+\s*[\d.,]+\s*(?:vnd|d|dong)/.test(s);
  const refund=/refund|reversal|취소|환불|hoan tien/.test(s);
  if(!expense&&!income&&!refund)return skip('No completed transaction found');
  if(!amounts.length)return skip('Transaction amount not recognized');
  const facts=transferFacts(raw,refund?'refund':income&&!expense?'income':'expense');
  let type=refund?'refund':facts.positive&&!facts.negative?'income':income&&!expense?'income':'expense';
  if(facts.ownAccount)type='transfer';
  const timing=smsTiming(obj,raw,cur,date);
  let suppliedDate=obj.date;
  if(timing.receivedTime)suppliedDate=timeParts(timing.receivedTime,timing.timeZone).date;
  const hasMetadata=typeof suppliedDate==='string'&&validDate(suppliedDate.slice(0,10));
  const detected=detectDate(raw,hasMetadata?suppliedDate.slice(0,10):date);
  const merchant=type==='income'&&facts.payer?facts.payer:merchantName(raw,bank);
  const warnings=[];
  if(bank==='Unknown bank')warnings.push('Check bank');
  if(detected.inferred&&!hasMetadata)warnings.push('Check date');
  if(merchant==='Unidentified transaction')warnings.push('Add merchant');
  if(amounts.length>1)warnings.push('Multiple amounts: check total');
  if(income&&expense&&!refund&&!(facts.positive&&!facts.negative))warnings.push('Check transaction type');
  if(timing.invalidTimestamp)warnings.push('Invalid transaction timestamp');
  if(timing.timeDateAssumed)warnings.push('Time found; check the assumed date');
  if(/transfer|이체|chuyen (?:khoan|tien)/.test(s))warnings.push('If between your own accounts, choose Transfer');
  const t={bank,merchant,amount:amounts[0].amount,currency:cur,date:timing.transactionTime?timing.timingDate:detected.date,type,category:categorize(merchant,type),raw,source:'sms',warnings,...facts,...timing,incomingTransfer:type==='income'&&(facts.incomingTransfer||facts.positive)};
  t.fingerprint=fingerprint(t);return {status:'parsed',transaction:t};
}
export function parseBatch(messages,options={},existing=[]){
  if(!Array.isArray(messages)||messages.length>5000)throw new Error('Import up to 5,000 messages at a time.');
  const seen=new Set(existing.flatMap(t=>[t.fingerprint,fingerprint(t)].filter(Boolean)));const transactions=[],skipped=[];
  for(const m of messages){const result=parseSms(m,options);if(result.status==='skipped'){skipped.push(result);continue;}const t=result.transaction;if(seen.has(t.fingerprint)){skipped.push({raw:t.raw,reason:'Duplicate message'});continue;}seen.add(t.fingerprint);transactions.push(t);}
  return {transactions,skipped};
}
export function summarize(transactions,{month,bank='all',currency='KRW'}={}){
  const selected=transactions.filter(t=>(!month||t.date.startsWith(month))&&(bank==='all'||t.bank===bank)&&t.currency===currency);
  const expenses=selected.filter(t=>t.type==='expense');const income=selected.filter(t=>['income','refund'].includes(t.type));
  const spending=expenses.reduce((v,t)=>v+t.amount,0);const moneyIn=income.reduce((v,t)=>v+t.amount,0);const categories={};const days={};
  expenses.forEach(t=>{categories[t.category]=(categories[t.category]||0)+t.amount;const d=Number(t.date.slice(8,10));days[d]=(days[d]||0)+t.amount;});
  return {selected,expenses,spending,moneyIn,net:moneyIn-spending,categories,days};
}
export function receiptSuggestion(text,{currency='KRW',date=localDate()}={}){
  const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);const cur=detectCurrency(text,currency);const candidates=[];
  lines.forEach((line,index)=>{const s=normalize(line);if(/subtotal|sub total|tien hang|부가세|공급가|거스름|change|cash tendered|tien khach dua/.test(s))return;
    const marked=extractAmounts(line,cur).filter(a=>!a.balance);const plain=[...line.matchAll(/(?:^|\s)(\d{1,3}(?:[.,]\d{3})+|\d{3,12})(?=\s|$)/g)].map(m=>({amount:parseAmount(m[1],cur)})).filter(a=>a.amount);
    const amounts=marked.length?marked:plain;if(!amounts.length)return;
    const priority=/grand total|total due|amount paid|thanh toan|tong cong|tong tien|합계|결제금액|받을금액|총액|총금액/.test(s)?3:/\btotal\b|총/.test(s)?2:0;
    amounts.forEach(a=>candidates.push({amount:a.amount,priority,index}));});
  candidates.sort((a,b)=>b.priority-a.priority||b.amount-a.amount);
  const merchant=lines.slice(0,7).find(l=>/[a-zA-Z가-힣À-ỹ]/.test(l)&&!/^receipt$|^영수증$|^hoa don$|tax invoice|사업자|영수증번호|tel|전화|\d{2}[:/.-]\d{2}/i.test(l))||'';
  return {merchant:merchant.slice(0,100),amount:candidates[0]?.amount??'',currency:cur,date:detectDate(text,date).date,category:categorize(merchant),type:'expense',bank:'Cash / receipt',source:'receipt',raw:text,warnings:['Review OCR amount, merchant, and date'],alternatives:[...new Set(candidates.map(c=>c.amount))].slice(0,5)};
}
export function demoTransactions(){
  const month=localDate().slice(0,7);const prev=new Date();prev.setDate(1);prev.setMonth(prev.getMonth()-1);const pm=localDate(prev).slice(0,7);
  const seed=[['스타벅스 강남',6500,'Food & drinks',17],['쿠팡',42800,'Shopping',16],['이마트',68400,'Groceries',16],['카카오 T',14600,'Transport',15],['Netflix',17000,'Entertainment',14],['GS25',8200,'Groceries',13],['배달의민족',24500,'Food & drinks',12],['올리브영',35900,'Shopping',11],['서울약국',12500,'Health',10],['스타벅스',5800,'Food & drinks',9],['이마트',53200,'Groceries',8],['월세',650000,'Bills & home',7],['카카오 T',18200,'Transport',6],['김밥천국',9500,'Food & drinks',5],['쿠팡',29000,'Shopping',4],['GS25',4900,'Groceries',3],['한식당',28000,'Food & drinks',2],['KT통신',55000,'Bills & home',1]];
  const rows=seed.map(([merchant,amount,category,day],i)=>({id:`demo-kr-${i}`,merchant,amount,category,date:`${month}-${String(day).padStart(2,'0')}`,bank:i%3?'Shinhan':'KB Kookmin',type:'expense',currency:'KRW',source:'sms',raw:`[${i%3?'신한카드':'KB국민카드'}] 승인\n${amount.toLocaleString('en-US')}원\n${month}-${String(day).padStart(2,'0')}\n${merchant}`,warnings:[]}));
  rows.push({id:'demo-salary',merchant:'Monthly salary',amount:3200000,category:'Income',date:`${month}-01`,bank:'Shinhan',type:'income',currency:'KRW',source:'sms',raw:'Synthetic demo salary transaction',warnings:[]});
  const vn=[['Highlands Coffee',65000,'Food & drinks',17],['WinMart',385000,'Groceries',16],['Grab',92000,'Transport',15],['Shopee',249000,'Shopping',14],['Phở 24',75000,'Food & drinks',12],['EVN',460000,'Bills & home',10],['CGV',130000,'Entertainment',8]];
  vn.forEach(([merchant,amount,category,day],i)=>rows.push({id:`demo-vn-${i}`,merchant,amount,category,date:`${month}-${String(day).padStart(2,'0')}`,bank:i%2?'Techcombank':'Vietcombank',type:'expense',currency:'VND',source:'sms',raw:`${i%2?'TCB':'VCB'}: GD -${amount.toLocaleString('en-US')} VND tai ${merchant} ngay ${month}-${String(day).padStart(2,'0')}.`,warnings:[]}));
  rows.push({id:'demo-vn-income',merchant:'Lương tháng',amount:24000000,category:'Income',date:`${month}-01`,bank:'Vietcombank',type:'income',currency:'VND',source:'sms',raw:'Synthetic demo salary transaction',warnings:[]});
  seed.slice(0,11).forEach(([merchant,amount,category,day],i)=>rows.push({id:`demo-prev-${i}`,merchant,amount:Math.round(amount*1.18),category,date:`${pm}-${String(day).padStart(2,'0')}`,bank:'Shinhan',type:'expense',currency:'KRW',source:'sms',raw:`Synthetic previous-month demo ${i}`,warnings:[]}));
  return rows.map(t=>({...t,fingerprint:fingerprint(t)}));
}
