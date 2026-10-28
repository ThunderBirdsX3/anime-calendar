import test from 'node:test';
import assert from 'node:assert/strict';
import { airingState, nextAiringTime } from '../public/airing.js';
import { renderPage } from '../src/render.js';
const now=Date.parse('2026-10-28T13:00:00Z');
test('live status starts exactly at airing time and ends exactly at episode duration',()=>{
  const start=now/1000;
  assert.equal(airingState(start,24,now-1).state,'upcoming');
  assert.equal(airingState(start,24,now).state,'live');
  assert.equal(airingState(start,24,now+24*60000-1).state,'live');
  assert.equal(airingState(start,24,now+24*60000).state,'aired');
});
test('missing duration never pretends an episode is currently live',()=>{
  for(const duration of [null,undefined,0,-1,'invalid']){
    assert.equal(airingState(now/1000-60,duration,now).state,'started');
    assert.equal(airingState(now/1000-60,duration,now).label,'เริ่มฉายแล้ว');
  }
});
test('next event is strictly future, works with unordered values and returns null when finished',()=>{
  assert.equal(nextAiringTime([now/1000,now/1000+600,now/1000+60,'invalid'],now),now/1000+60);
  assert.equal(nextAiringTime([now/1000-5,now/1000],now),null);
  assert.equal(nextAiringTime([],now),null);
});
test('render marks all live and tied next events, then recomputes next within search results',()=>{
  const make=(id,seconds,duration,title)=>({id,airingAt:now/1000+seconds,episode:1,media:{id,title:{romaji:title},genres:[],format:'TV',duration,externalLinks:[]}});
  const snapshot={key:'2026-10-28',updatedAt:now,data:[make(1,-60,24,'Live'),make(2,60,24,'Next A'),make(3,60,24,'Next B'),make(4,3600,24,'Later'),make(5,-3600,24,'Finished')]};
  const html=renderPage({snapshot,now});
  assert.equal((html.match(/class="anime-card is-live"/g)||[]).length,1);
  assert.equal((html.match(/class="anime-card is-next"/g)||[]).length,2);
  assert.match(html,/status-live[^>]*>.*?กำลังฉาย/s);
  assert.match(html,/status-aired[^>]*>.*?ฉายแล้ว/s);
  const filtered=renderPage({snapshot,now,params:{q:'Later'}});
  assert.match(filtered,/<article class="anime-card is-next"[^>]*data-media-id="4"/);
  assert.doesNotMatch(filtered,/<article class="anime-card is-next"[^>]*data-media-id="2"/);
});
