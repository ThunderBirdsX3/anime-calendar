import test from 'node:test';
import assert from 'node:assert/strict';
import { openCache } from '../src/cache.js';
import { createAniList, createSync } from '../src/anilist.js';
import { dayKey, weekWindow, weekDays, nextSeason } from '../src/time.js';
import { renderPage, safeUrl, releaseDate } from '../src/render.js';
import { isSnapshotFresh } from '../src/freshness.js';
const now = Date.parse('2026-10-28T03:00:00Z');
const media = {id:1,title:{romaji:'Test Anime'},countryOfOrigin:'JP',isAdult:false,format:'TV',genres:['Fantasy'],startDate:{year:2027,month:1},coverImage:{large:'https://s4.anilist.co/file/cover.jpg'},siteUrl:'https://anilist.co/anime/1',description:'<b>Summary</b>',externalLinks:[]};
const event = {id:1,airingAt:Date.parse('2026-10-28T13:00:00Z')/1000,episode:4,media};
const response = page => ({ok:true,headers:new Headers(),json:async()=>({data:{Page:page}})});
test('Thai midnight bounds include today and exactly the next six days',()=>{
  assert.equal(dayKey(Date.parse('2026-10-27T17:00:00Z')),'2026-10-28');
  assert.equal(dayKey(Date.parse('2026-10-27T16:59:59Z')),'2026-10-27');
  const {start,end} = weekWindow(now);
  assert.equal(new Date(start*1000).toISOString(),'2026-10-27T17:00:00.000Z');
  assert.equal(end-start,7*86400);
  assert.deepEqual(weekDays(now).map(d=>d.key),['2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03']);
});
test('next season handles all quarters and year rollover in Bangkok',()=>{
  for (const [date,season,year] of [['2026-01-01','SPRING',2026],['2026-04-01','SUMMER',2026],['2026-07-01','FALL',2026],['2026-10-01','WINTER',2027]]) {
    assert.equal(nextSeason(Date.parse(`${date}T00:00:00+07:00`)).season,season);
    assert.equal(nextSeason(Date.parse(`${date}T00:00:00+07:00`)).year,year);
  }
  assert.equal(nextSeason(Date.parse('2026-09-30T17:00:00Z')).year,2027);
});
test('calendar follows all pages, excludes missing/adult/non-Japanese entries and bounds',async()=>{
  const calls=[];
  const api=createAniList({delay:0,fetcher:async(_url,options)=>{
    const {variables}=JSON.parse(options.body); calls.push(variables);
    return response({pageInfo:{hasNextPage:variables.page===1},airingSchedules:variables.page===1 ? [event,{...event,id:2,media:null},{...event,id:3,media:{...media,isAdult:true}}] : [{...event,id:4,media:{...media,countryOfOrigin:'CN'}},{...event,id:5,airingAt:weekWindow(now).end},{...event,id:6,airingAt:weekWindow(now).start},event]});
  }});
  const snapshot=await api.calendar(now);
  assert.deepEqual(snapshot.data.map(r=>r.id),[6,1]);
  assert.equal(calls.length,2);
  assert.equal(calls[0].from,weekWindow(now).start-1);
  assert.equal(calls[1].page,2);
});
test('upcoming queries only the next season and not-yet-released titles',async()=>{
  let body;
  const api=createAniList({delay:0,fetcher:async(_url,options)=>{body=JSON.parse(options.body);return response({pageInfo:{hasNextPage:false},media:[media]});}});
  const result=await api.upcoming(now);
  assert.equal(result.key,'WINTER-2027'); assert.equal(body.variables.year,2027);assert.equal(body.variables.season,'WINTER');
  assert.match(body.query,/status:NOT_YET_RELEASED/);
  assert.match(body.query,/externalLinks \{ site url type language notes icon isDisabled \}/);
});
test('pagination failure leaves the complete SQLite snapshot intact',async()=>{
  const cache=openCache(':memory:'); cache.set('calendar','old',[event],1);
  const api=createAniList({delay:0,fetcher:async(_url,options)=>{
    return JSON.parse(options.body).variables.page===1 ? response({pageInfo:{hasNextPage:true},airingSchedules:[event]}) : {ok:false,status:429,headers:new Headers({'retry-after':'120'})};
  }});
  await assert.rejects(api.calendar(now),error=>error.retryAfter===120);
  assert.equal(cache.get('calendar').key,'old'); assert.equal(cache.get('calendar').updatedAt,1);cache.close();
});
test('sync coalesces requests, honors daily freshness and preserves stale data on errors',async()=>{
  const cache=openCache(':memory:');let calls=0;
  const api={calendar:async()=>{calls++;return {key:weekWindow().key,data:[event]};},upcoming:async()=>{calls++;const s=nextSeason();return {key:`${s.season}-${s.year}`,data:[media]};}};
  const sync=createSync(cache,api);
  await Promise.all([sync.refresh(),sync.refresh(),sync.refresh()]);assert.equal(calls,2);
  await sync.refresh();assert.equal(calls,2);
  const saved=cache.get('calendar');api.calendar=async()=>{throw new Error('offline');};
  await sync.refresh(true);assert.equal(sync.error('calendar'),'offline');assert.deepEqual(cache.get('calendar'),saved);
  cache.set('calendar','stale',saved.data,1);await sync.refresh();assert.equal(sync.error('calendar'),'offline');cache.close();
});
test('daily sync skips repeat checks and restarts, then refreshes at Bangkok midnight',async()=>{
  const cache=openCache(':memory:');let time=Date.parse('2026-10-28T00:01:00+07:00');
  const calls=[];
  const api={
    calendar:async at=>{calls.push(['calendar',at]);return {key:weekWindow(at).key,data:[event]};},
    upcoming:async at=>{calls.push(['upcoming',at]);const s=nextSeason(at);return {key:`${s.season}-${s.year}`,data:[media]};}
  };
  const options={clock:()=>time};
  const sync=createSync(cache,api,options);
  await sync.refresh();assert.equal(calls.length,2);
  time=Date.parse('2026-10-28T23:59:59+07:00');
  await sync.refresh();await createSync(cache,api,options).refresh();assert.equal(calls.length,2);
  assert.equal(isSnapshotFresh(cache.get('calendar'),'calendar',time),true);
  assert.equal(isSnapshotFresh(cache.get('upcoming'),'upcoming',time),true);
  assert.doesNotMatch(renderPage({snapshot:cache.get('calendar'),now:time}),/ข้อมูลอาจยังไม่ล่าสุด/);
  time=Date.parse('2026-10-29T00:00:00+07:00');
  assert.equal(isSnapshotFresh(cache.get('calendar'),'calendar',time),false);
  assert.equal(isSnapshotFresh(cache.get('upcoming'),'upcoming',time),false);
  await sync.refresh();assert.equal(calls.length,4);
  assert.equal(cache.get('calendar').key,'2026-10-29');
  assert.equal(cache.get('upcoming').updatedAt,time);
  await sync.refresh();assert.equal(calls.length,4);cache.close();
});
test('failed daily sync keeps SQLite data, honors retry delay and retries only failed views',async()=>{
  const cache=openCache(':memory:');let time=now;let calendarCalls=0;let upcomingCalls=0;
  cache.set('calendar',weekWindow(now-86400000).key,[event],now-86400000);
  const saved=cache.get('calendar');
  const api={
    calendar:async at=>{if(++calendarCalls===1)throw Object.assign(new Error('rate limited'),{retryAfter:120});return {key:weekWindow(at).key,data:[event]};},
    upcoming:async at=>{upcomingCalls++;const s=nextSeason(at);return {key:`${s.season}-${s.year}`,data:[media]};}
  };
  const sync=createSync(cache,api,{clock:()=>time});
  await sync.refresh();assert.deepEqual(cache.get('calendar'),saved);
  time+=60000;await sync.refresh();assert.equal(calendarCalls,1);assert.equal(upcomingCalls,1);
  time+=60000;await sync.refresh();assert.equal(calendarCalls,2);assert.equal(upcomingCalls,1);
  assert.equal(sync.error('calendar'),undefined);assert.equal(cache.get('calendar').updatedAt,time);cache.close();
});
test('a calendar fetch crossing Thai midnight refreshes the new day on the next check',async()=>{
  const cache=openCache(':memory:');let time=Date.parse('2026-10-28T23:59:59+07:00');let calls=0;
  const api={calendar:async at=>{calls++;time+=2000;return {key:weekWindow(at).key,data:[]};},upcoming:async at=>{const s=nextSeason(at);return {key:`${s.season}-${s.year}`,data:[]};}};
  const sync=createSync(cache,api,{clock:()=>time});
  await sync.refresh();assert.equal(cache.get('calendar').key,'2026-10-28');
  await sync.refresh();assert.equal(calls,2);assert.equal(cache.get('calendar').key,'2026-10-29');cache.close();
});
test('cache stores only one snapshot for each view',()=>{
  const cache=openCache(':memory:');cache.set('calendar','a',[1]);cache.set('calendar','b',[2]);assert.deepEqual(cache.get('calendar').data,[2]);assert.equal(cache.get('calendar').key,'b');cache.close();
});
test('render never exposes history and filters on the server',()=>{
  const old={...event,id:2,airingAt:weekWindow(now).start-1,media:{...media,id:2,title:{romaji:'Historical Anime'}}};
  const snapshot={key:'2026-10-27',updatedAt:now,data:[event,old]};
  const html=renderPage({snapshot,now});assert.match(html,/20:00/);assert.doesNotMatch(html,/Historical Anime/);assert.equal((html.match(/class="day-section"/g)||[]).length,7);
  const filtered=renderPage({snapshot,now,params:{q:'absent'}});assert.match(filtered,/data-media-id="1" data-airing="\d+" hidden/);
});
test('previous season is unavailable rather than shown as upcoming',()=>{
  const html=renderPage({snapshot:{key:'FALL-2026',updatedAt:now,data:[media]},upcoming:true,now});
  assert.doesNotMatch(html,/Test Anime/);assert.match(html,/WINTER 2027/);assert.match(html,/data-missing="true"/);
});
test('untrusted API text cannot escape the HTML or JSON script',()=>{
  const dangerous={...media,title:{romaji:'</script><script>alert(1)</script>'},description:'</script><img src=x onerror=alert(1)>'};
  const html=renderPage({snapshot:{key:'WINTER-2027',updatedAt:now,data:[dangerous]},upcoming:true,now});
  assert.doesNotMatch(html,/<script>alert/);assert.match(html,/\\u003c\/script>/);
  assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('https://anilist.co.evil.test/a'),'');assert.equal(safeUrl('https://evil.test/image.png',true),'');
});
test('partial release dates are not fabricated',()=>{
  assert.equal(releaseDate({}),'ยังไม่ระบุวัน');assert.match(releaseDate({year:2027,month:1}),/รอยืนยันวัน/);assert.doesNotMatch(releaseDate({year:2027,month:1,day:7}),/รอยืนยันวัน/);
});
