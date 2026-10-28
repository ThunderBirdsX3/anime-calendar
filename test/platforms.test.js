import test from 'node:test';
import assert from 'node:assert/strict';
import { streamingLinks, platformIcons, streamingUrl } from '../src/platforms.js';
import { renderPage } from '../src/render.js';
import { openCache } from '../src/cache.js';
import { createSync } from '../src/anilist.js';
import { weekWindow, nextSeason } from '../src/time.js';
import { PLATFORM_BRANDS, brandForSite } from '../src/platform-brands.js';
import { existsSync } from 'node:fs';
const provider = {site:'Crunchyroll',url:'https://www.crunchyroll.com/series/example',type:'STREAMING',icon:'https://s4.anilist.co/file/anilistcdn/link/icon/test.png',isDisabled:false};
test('only enabled streaming links with safe destinations become platforms',()=>{
  const result=streamingLinks({externalLinks:[provider,provider,{...provider,type:'SOCIAL',site:'Twitter'},{...provider,isDisabled:true,site:'Disabled'},{...provider,url:'javascript:alert(1)',site:'Bad'},{...provider,url:'https://user:password@example.com',site:'Credentials'},null,{...provider,site:''}]});
  assert.equal(result.length,1);assert.equal(result[0].site,'Crunchyroll');
  assert.equal(streamingUrl('http://example.com'),'');assert.deepEqual(streamingLinks({}),[]);
});
test('preserve explicit notes without inferring SUB or DUB from language',()=>{
  const result=streamingLinks({externalLinks:[{...provider,language:'English'},{...provider,language:'Thai',notes:'Thai subtitles; no English dub'},{...provider,notes:'US only'}]});
  assert.equal(result[0].notes,'');assert.equal(result[0].noteLabel,'');assert.equal(result[0].language,'English');
  assert.equal(result[1].noteLabel,'SUB/DUB');assert.equal(result[1].notes,'Thai subtitles; no English dub');
  assert.equal(result[2].noteLabel,'หมายเหตุ');
  assert.equal(platformIcons({externalLinks:[provider,{...provider,language:'Thai'}]}).length,1);
  assert.equal(result.length,3);
});
test('untrusted icon URLs fall back without suppressing valid platform links',()=>{
  const [link]=streamingLinks({externalLinks:[{...provider,icon:'https://evil.example/icon.svg'}]});
  assert.equal(link.icon,'');assert.equal(link.url,provider.url);
});
test('brand icons map to local artwork without accepting arbitrary CSS classes',()=>{
  for (const brand of PLATFORM_BRANDS) {
    assert.match(brand.color,/^#[0-9a-f]{6}$/i);
    assert.ok(existsSync(new URL(`../public/platform-icons/${brand.id}.png`,import.meta.url)));
    assert.equal(brandForSite(brand.site.toUpperCase()),brand.id);
  }
  assert.equal(brandForSite('unknown" onclick="alert(1)'),'');
  assert.equal(streamingLinks({externalLinks:[provider]})[0].brand,'crunchyroll');
});
test('both calendar and upcoming render accessible icons as independent outbound links',()=>{
  const media={id:1,title:{romaji:'Anime'},genres:[],externalLinks:[provider,{...provider,site:'Bilibili TV',url:'https://www.bilibili.tv/en/media/example',icon:null}],startDate:{}};
  const now=Date.parse('2026-10-28T03:00:00Z');
  const snapshots=[{upcoming:false,snapshot:{key:'2026-10-28',updatedAt:now,data:[{id:1,airingAt:now/1000+300,episode:1,media}]}},{upcoming:true,snapshot:{key:'WINTER-2027',updatedAt:now,data:[media]}}];
  for(const input of snapshots){
    const html=renderPage({...input,now});
    assert.match(html,/aria-label="ช่องทางรับชม"/);
    assert.match(html,/class="platform-logo brand-crunchyroll"/);
    assert.match(html,/aria-label="รับชมทาง Crunchyroll \(เปิดแท็บใหม่\)"/);
    assert.match(html,/class="platform-icon" href="https:\/\/www.crunchyroll.com\/series\/example" target="_blank" rel="noopener noreferrer"/);
    const data=JSON.parse(html.match(/<script id="media-data" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.equal(data[1].platforms.length,2);assert.equal(data[1].platforms[0].notes,'');assert.equal(data[1].platforms[0].noteLabel,'');
  }
});
test('platform text and notes cannot inject markup into cards or dialog JSON',()=>{
  const media={id:1,title:{romaji:'Anime'},genres:[],startDate:{},externalLinks:[{...provider,site:'<img src=x onerror=alert(1)>',notes:'</script><script>alert(1)</script>'}]};
  const now=Date.parse('2026-10-28T03:00:00Z');
  const html=renderPage({snapshot:{key:'WINTER-2027',updatedAt:now,data:[media]},upcoming:true,now});
  assert.doesNotMatch(html,/<img src=x/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;img/);
});
test('existing SQLite snapshots without externalLinks refresh before normal TTL expires',async()=>{
  const cache=openCache(':memory:');
  const season=nextSeason();cache.set('calendar',weekWindow().key,[{media:{id:1}}]);cache.set('upcoming',`${season.season}-${season.year}`,[{id:1}]);
  let calls=0;
  const api={calendar:async()=>{calls++;return {key:weekWindow().key,data:[{media:{id:1,externalLinks:[]}}]};},upcoming:async()=>{calls++;return {key:`${season.season}-${season.year}`,data:[{id:1,externalLinks:[]}]};}};
  const sync=createSync(cache,api);await sync.refresh();assert.equal(calls,2);await sync.refresh();assert.equal(calls,2);cache.close();
});
