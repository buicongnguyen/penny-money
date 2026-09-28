import {VI} from './vi.mjs';
export const LANGUAGE_KEY='penny.language.v1';
export function resolveLanguage(saved,languages=[]){return ['en','vi'].includes(saved)?saved:languages[0]?.toLowerCase().startsWith('vi')?'vi':'en';}
export function languagePreference(storage,languages=[]){
  let saved;try{saved=storage?.getItem(LANGUAGE_KEY);}catch{}
  let language=resolveLanguage(saved,languages);
  return {get language(){return language;},set(value){if(!['en','vi'].includes(value))return language;language=value;try{storage?.setItem(LANGUAGE_KEY,value);}catch{}return language;}};
}
let storage;try{if(typeof window!=='undefined')storage=window.localStorage;}catch{}
const preference=languagePreference(storage,typeof window==='undefined'?[]:window.navigator?.languages||[]);
export const language=()=>preference.language;
export const locale=()=>language()==='vi'?'vi-VN':'en-US';
export function translate(key,params={},lang=language()){
  const message=lang==='vi'&&Object.hasOwn(VI,key)?VI[key]:key;
  return String(message).replace(/\{(\w+)\}/g,(match,name)=>Object.hasOwn(params,name)?String(params[name]):match);
}
export const tr=translate;
export function messageError(message){
  const temporary='Changes are temporary. Use Backup & restore before closing this tab.';
  if(message.endsWith(' '+temporary))return messageError(message.slice(0,-temporary.length-1))+' '+tr(temporary);
  if(Object.hasOwn(VI,message))return tr(message);
  let match=message.match(/^Invalid transaction (\d+)\.$/);if(match)return tr('Invalid transaction {number}.',{number:match[1]});
  match=message.match(/^Missing merchant or bank in transaction (\d+)\.$/);if(match)return tr('Missing merchant or bank in transaction {number}.',{number:match[1]});
  match=message.match(/^Invalid (\w+)\.$/);if(match)return tr('Invalid {field}.',{field:match[1]});
  return message;
}
// Explicitly bind only app-owned static UI. Never walk transaction rows or raw SMS.
// Preserve option values before translating labels, including implicit values.
const bindings=new Map();
function updateBinding(node,entry){for(const [attribute,source] of entry){const value=source.replace(/\S[\s\S]*\S|\S/,text=>tr(text));if(attribute==='text')node.nodeValue=value;else node.setAttribute(attribute,value);}}
export function localize(root){
  const elements=[...(root.nodeType===1?[root]:[]),...root.querySelectorAll('*')];
  for(const element of elements){
    if(element.closest('script,style,[translate="no"]'))continue;
    if(element.tagName==='OPTION'&&!element.hasAttribute('value'))element.value=element.textContent;
    const attributes=new Map();
    for(const attribute of ['aria-label','title','placeholder','alt']){const source=element.getAttribute(attribute);if(source&&Object.hasOwn(VI,source.trim()))attributes.set(attribute,source);}
    if(attributes.size&&!bindings.has(element)){bindings.set(element,attributes);updateBinding(element,attributes);}
    for(const node of element.childNodes){if(node.nodeType!==3||bindings.has(node)||!Object.hasOwn(VI,node.nodeValue.trim()))continue;const entry=new Map([['text',node.nodeValue]]);bindings.set(node,entry);updateBinding(node,entry);}
  }
}
export function initLanguage(onChange){
  const wrapper=document.createElement('label');wrapper.className='language-control';wrapper.innerHTML='<span>Language</span><select id="language-select" aria-label="Language"><option value="en">English</option><option value="vi">Tiếng Việt</option></select>';
  document.querySelector('.topbar').append(wrapper);localize(document.body);
  const select=document.getElementById('language-select');
  function apply(){document.documentElement.lang=language();document.title=tr('Penny — Your money, made clear');select.value=language();for(const [node,entry] of bindings){if(node.isConnected)updateBinding(node,entry);else bindings.delete(node);}window.dispatchEvent(new Event('penny:language'));}
  select.onchange=()=>{preference.set(select.value);apply();onChange();};apply();
}
