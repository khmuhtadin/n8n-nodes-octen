import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Octen } = require('../dist/nodes/Octen/Octen.node.js');
const { OctenApi } = require('../dist/credentials/OctenApi.credentials.js');
function mock(params, response = { code: 0, data: { results: [] } }) {
 const calls=[]; return {calls, ctx: { getInputData:()=>[{json:{}}], getNode:()=>({name:'Octen',type:'octen',typeVersion:1,position:[0,0]}), getNodeParameter:(n,i,d)=>params[n] ?? d, continueOnFail:()=>false, helpers:{httpRequestWithAuthentication:async(auth,request)=>{calls.push({auth,request}); return response;}} }};
}
for (const [operation, params, path, body] of [
 ['search',{query:'AI research',count:3,additionalOptions:{includeDomains:'example.org,example.com',fullContent:true}},'/search',{query:'AI research',count:3,include_domains:['example.org','example.com'],full_content:{enable:true}}],
 ['broadSearch',{query:'compare tools',maxQueries:4,additionalOptions:{timeRange:'week',fullContent:true}},'/broad-search',{query:'compare tools',max_queries:4,search_options:{time_range:'week',full_content:{enable:true}}}],
 ['extract',{urls:'https://a.test\nhttps://b.test',additionalOptions:{focusQuery:'pricing',mode:'auto'}},'/extract',{urls:['https://a.test','https://b.test'],query:'pricing',mode:'auto'}],
 ['imageSearch',{imageInputType:'text',imageQuery:'a skyline',count:5},'/image-search',{inputs:[{type:'text',data:'a skyline'}],count:5}],
 ['imageSearch',{imageInputType:'image',imageQuery:'https://a.test/image.jpg',count:2},'/image-search',{inputs:[{type:'image',url:'https://a.test/image.jpg'}],count:2}],
 ['embedding',{texts:'one\ntwo',additionalOptions:{model:'octen-embedding-4b',inputType:'query',dimension:512}},'/embedding',{input:['one','two'],model:'octen-embedding-4b',input_type:'query',dimension:512}],
]) test(`${operation} maps request correctly`,async()=>{const {ctx,calls}=mock({operation,...params});const out=await new Octen().execute.call(ctx); assert.equal(calls[0].auth,'octenApi');assert.equal(calls[0].request.url,'https://api.octen.ai'+path);assert.equal(calls[0].request.method,'POST');assert.deepEqual(calls[0].request.body,body);assert.equal(out[0][0].json.code,0);assert.deepEqual(out[0][0].pairedItem,{item:0});});
test('rejects image count above 10',async()=>{const {ctx}=mock({operation:'imageSearch',imageInputType:'text',imageQuery:'x',count:11});await assert.rejects(new Octen().execute.call(ctx),/must not exceed 10/);});
test('rejects more than 20 URLs',async()=>{const {ctx}=mock({operation:'extract',urls:Array(21).fill('https://a.test').join(',')});await assert.rejects(new Octen().execute.call(ctx),/between 1 and 20/);});
test('surfaces business errors',async()=>{const {ctx}=mock({operation:'search',query:'x',count:1},{code:123,msg:'bad'});await assert.rejects(new Octen().execute.call(ctx),/Octen error 123/);});
test('continue on fail returns paired error',async()=>{const {ctx}=mock({operation:'search',query:'x',count:1},{code:9,msg:'bad'});ctx.continueOnFail=()=>true; const out=await new Octen().execute.call(ctx);assert.match(out[0][0].json.error,/Octen error 9/);assert.equal(out[0][0].pairedItem.item,0);});
test('credential uses auth-checked search request',()=>{const c=new OctenApi();assert.equal(c.test.request.url,'/search');assert.equal(c.test.request.method,'POST');assert.equal(c.authenticate.properties.headers['x-api-key'],'={{$credentials.apiKey}}');});
test('node is available as an agent tool',()=>assert.equal(new Octen().description.usableAsTool,true));
