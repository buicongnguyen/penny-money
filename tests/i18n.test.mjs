import test from 'node:test';
import assert from 'node:assert/strict';
import {LANGUAGE_KEY,languagePreference,resolveLanguage,translate} from '../dist/i18n.mjs';
import {VI} from '../dist/vi.mjs';
import {CATEGORIES} from '../dist/domain.mjs';

test('saved language overrides browser preference, with a supported first-visit default',()=>{
  assert.equal(resolveLanguage('en',['vi-VN']),'en');
  assert.equal(resolveLanguage('vi',['en-US']),'vi');
  assert.equal(resolveLanguage(null,['vi-VN']),'vi');
  assert.equal(resolveLanguage('unsupported',['ko-KR']),'en');
  assert.equal(resolveLanguage(null,[]),'en');
});

test('language switching persists separately without rewriting financial data or filters',()=>{
  const ledger='{"transactions":[{"merchant":"Income","category":"Food & drinks","raw":"Original SMS"}]}';
  const entries=new Map([['penny.local.v1',ledger],['penny.preferences.v1','{"currency":"VND","month":"2026-09"}']]);
  const writes=[];
  const storage={getItem:key=>entries.get(key),setItem:(key,value)=>{writes.push(key);entries.set(key,value);}};
  const preference=languagePreference(storage,['en']);
  preference.set('vi');
  assert.equal(languagePreference(storage,['en']).language,'vi');
  preference.set('en');
  assert.equal(languagePreference(storage,['vi']).language,'en');
  preference.set('ko');
  assert.deepEqual(writes,[LANGUAGE_KEY,LANGUAGE_KEY]);
  assert.equal(entries.get('penny.local.v1'),ledger);
  assert.equal(entries.get('penny.preferences.v1'),'{"currency":"VND","month":"2026-09"}');
});

test('language switching still works when storage is blocked',()=>{
  const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('full');}};
  const preference=languagePreference(blocked,['en-US']);
  assert.equal(preference.set('vi'),'vi');
  assert.equal(preference.language,'vi');
  assert.equal(languagePreference(undefined,['vi']).language,'vi');
});

test('translated templates preserve names and literal replacement characters',()=>{
  assert.equal(translate('Edit {name}',{name:'Income $& {count}'},'vi'),'Sửa Income $& {count}');
  assert.equal(translate('{count} transactions found',{count:3},'vi'),'Tìm thấy 3 giao dịch');
  assert.equal(translate('Edit {name}',{name:'Cà phê'},'en'),'Edit Cà phê');
  assert.equal(translate('Unrecognized message',{},'vi'),'Unrecognized message');
});

test('all Vietnamese templates retain their parameters and categories have display translations',()=>{
  const parameters=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  for(const [key,value] of Object.entries(VI)){
    assert.equal(typeof value,'string',key);
    assert.ok(value.trim(),key);
    assert.deepEqual(parameters(value),parameters(key),key);
  }
  for(const category of CATEGORIES)assert.ok(Object.hasOwn(VI,category),category);
});
