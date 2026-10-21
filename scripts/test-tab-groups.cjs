// Dependency-free regression checks for the optional browser companion.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8');
function setup(failAt = 0) {
  let listener, removedListener, updatedListener;
  const timers = [];
  const calls={created:[],removed:[],groups:[],updates:[],navigated:[],delays:[]};
  const chrome={runtime:{id:'test-extension',onMessage:{addListener:fn=>{listener=fn}}},tabs:{
    onRemoved:{addListener:fn=>{removedListener=fn}},
    onUpdated:{addListener:fn=>{updatedListener=fn}},
    update:async (id,data)=>{calls.navigated.push({id,...data})},
    create:async data=>{if(failAt && calls.created.length+1===failAt)throw Error('Create failed');calls.created.push(data);return {id:calls.created.length}},
    group:async data=>{calls.groups.push(data);return 25},
    remove:async id=>{calls.removed.push(id)}
  },tabGroups:{update:async(id,data)=>{calls.updates.push({id,...data})}}};
  vm.runInNewContext(code,{chrome,URL,setTimeout:(fn,ms)=>{calls.delays.push(ms);timers.push(fn)}});
  const sender={id:'test-extension',tab:{windowId:9},url:'https://notoow.github.io/gynecomastia-contents/'};
  const send=(message,who=sender)=>new Promise(resolve=>listener(message,who,resolve));
  const drain = async () => { for(let i=0;i<20;i++){await Promise.resolve();if(timers.length)timers.shift()();} };
  return {calls,sender,send,drain,close:id=>removedListener(id),navigate:id=>updatedListener(id,{url:'https://example.com/'})};
}
const post='https://gall.dcinside.com/mgallery/board/view/?id=dudbwmd&no=52064';
test('reject unrelated senders and unsafe URLs without opening tabs',async()=>{
 const {calls,sender,send}=setup();
 for(const url of ['javascript:alert(1)','https://example.com/','https://www.youtube.com.evil.test/watch?v=12345678901','https://user:pass@gall.dcinside.com/board/view/?no=1','https://gall.dcinside.com:444/board/view/?no=1']) {
  assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls:[url]})).ok,false);
 }
 assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls:[post]},{...sender,url:'https://evil.test/'})).ok,false);
 assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls:[post]},{...sender,id:'other-extension'})).ok,false);
 assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls:[]})).ok,false);
 assert.equal(calls.created.length,0);
});
test('create a named group in order, deduplicating links',async()=>{
 const {calls,send,drain}=setup();
 const second='https://www.youtube.com/watch?v=fsvSO7-Y1Q4&lc=comment';
 const reply=await send({type:'HIGHST_OPEN_GROUP',urls:[post,post,second],title:'하이스트 · 디시 · 2026년 10월'});
 assert.equal(reply.ok,true);assert.equal(reply.count,2);
 assert.deepEqual(calls.created.map(x=>x.url),['about:blank','about:blank']);
 assert.equal(calls.navigated.length,1);
 await drain();
 assert.deepEqual(calls.navigated.map(x=>x.url),[post,second]);
 assert.ok(calls.delays.every(ms=>ms>=3000&&ms<=6000));
 assert.ok(calls.created.every(x=>x.active===false&&x.windowId===9));
 assert.equal(calls.groups[0].tabIds.join(','),'1,2');
 assert.equal(calls.updates[0].title,'하이스트 · 디시 · 2026년 10월');
});
test('on partial failure remove only tabs created by this request',async()=>{
 const {calls,send}=setup(2);
 const reply=await send({type:'HIGHST_OPEN_GROUP',urls:[post,post.replace('52064','52063')]});
 assert.equal(reply.ok,false);assert.deepEqual(calls.removed,[1]);assert.equal(calls.groups.length,0);
});

test('reject overlapping requests and skip closed or manually navigated pending tabs',async()=>{
 const {calls,send,drain,close,navigate}=setup();
 const urls=[post,post.replace('52064','52063'),post.replace('52064','52062')];
 assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls})).ok,true);
 assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls})).ok,false);
 close(2);navigate(3);await drain();
 assert.deepEqual(calls.navigated.map(x=>x.id),[1]);
 assert.equal((await send({type:'HIGHST_OPEN_GROUP',urls:[post]})).ok,true);
 await drain();
});
