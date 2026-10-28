import { airingState, nextAiringTime } from './airing.js';
(() => {
  const cards = [...document.querySelectorAll('.anime-card')];
  const search = document.querySelector('#search');
  const format = document.querySelector('#format');
  const future = document.querySelector('#future');
  const count = document.querySelector('#result-count');
  const dialog = document.querySelector('#detail-dialog');
  const content = document.querySelector('#detail-content');
  const media = JSON.parse(document.querySelector('#media-data').textContent);
  const dayKey = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10);
  let filterTimer;
  function applyFilters(writeUrl = false) {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const past = card.dataset.airing && Number(card.dataset.airing) * 1000 <= Date.now();
      card.hidden = !!((query && !card.dataset.search.includes(query)) || (format.value && card.dataset.format !== format.value) || (future?.checked && past));
      if (!card.hidden) visible++;
    }
    const now = Date.now();
    const nextAt = nextAiringTime(cards.filter(card => !card.hidden && card.dataset.airing).map(card => card.dataset.airing), now);
    for (const card of cards) {
      if (!card.dataset.airing) continue;
      const status = airingState(card.dataset.airing, card.dataset.duration, now);
      const next = !card.hidden && nextAt !== null && Number(card.dataset.airing) === nextAt;
      card.dataset.state = status.state;
      card.classList.toggle('is-live',status.state === 'live');
      card.classList.toggle('is-next',next);
      const label = card.querySelector('.airing-status');
      label.className = `airing-status status-${status.state}`;
      label.title = status.hint;
      card.querySelector('[data-status]').textContent = status.label;
      card.querySelector('[data-next-label]').hidden = !next;
    }
    count.textContent = visible;
    for (const section of document.querySelectorAll('.day-section')) {
      const n = section.querySelectorAll('.anime-card:not([hidden])').length;
      section.querySelector('[data-day-count]').textContent = n;
      section.querySelector('.day-empty').hidden = n > 0;
    }
    const empty = document.querySelector('#no-results');
    if (empty) empty.hidden = visible > 0;
    if (writeUrl) {
      const url = new URL(location.href);
      for (const [name,value] of [['q',search.value],['format',format.value],['future',future?.checked ? '1' : '']]) {
        if (value) url.searchParams.set(name,value); else url.searchParams.delete(name);
      }
      history.replaceState(null,'',url);
    }
  }
  search.addEventListener('input',() => { clearTimeout(filterTimer); filterTimer = setTimeout(() => applyFilters(true),80); });
  format.addEventListener('change',() => applyFilters(true));
  future?.addEventListener('change',() => applyFilters(true));
  document.querySelector('.toolbar').addEventListener('submit', event => { event.preventDefault(); applyFilters(true); });
  document.addEventListener('keydown',event => {
    if (event.key === '/' && !dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); search.focus(); }
  });
  applyFilters();
  const tabs = [...document.querySelectorAll('.day-tab')];
  function activate(id) {
    for (const tab of tabs) {
      const active = tab.hash === `#${id}`;
      tab.classList.toggle('active',active);
      if (active) tab.setAttribute('aria-current','date'); else tab.removeAttribute('aria-current');
    }
  }
  for (const tab of tabs) tab.addEventListener('click',() => activate(tab.hash.slice(1)));
  document.querySelector('.today-button')?.addEventListener('click',() => activate(`day-${document.body.dataset.day}`));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) activate(entry.target.id);
    }, {rootMargin:'-5% 0px -70% 0px',threshold:0});
    for (const section of document.querySelectorAll('.day-section')) observer.observe(section);
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  let opener;
  document.addEventListener('click',event => {
    const link = event.target.closest('[data-detail]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const item = media[link.dataset.detail];
    if (!item || !dialog.showModal) return;
    event.preventDefault(); opener = link;
    content.replaceChildren();
    const top = element('div','dialog-top');
    if (item.cover) { const img = element('img','dialog-poster'); img.src = item.cover; img.alt = `ปก ${item.title}`; top.append(img); }
    const info = element('div');
    const title = element('h2','dialog-title',item.title); title.id = 'detail-title'; info.append(title);
    const alternate = [item.english !== item.title ? item.english : '',item.native].filter(Boolean).join(' · ');
    if (alternate) info.append(element('p','dialog-alternate',alternate));
    info.append(element('p','dialog-meta',[item.format?.replace('_',' '),item.episodes ? `${item.episodes} ตอน` : '',item.studio].filter(Boolean).join(' · ')));
    info.append(element('p','dialog-alternate',item.genres.join(' · ')));
    const scheduleCard = link.closest('[data-airing]');
    if (scheduleCard) {
      const status = airingState(scheduleCard.dataset.airing, scheduleCard.dataset.duration);
      info.append(element('p',`dialog-airing status-${status.state}`,`${status.label}${status.hint ? ` · ${status.hint}` : ''}`));
    }
    top.append(info); content.append(top);
    content.append(element('p','dialog-description',item.description || 'ยังไม่มีเรื่องย่อจากแหล่งข้อมูล'));
    const platforms = element('section','dialog-platforms');
    platforms.setAttribute('aria-labelledby','platforms-title');
    const platformTitle = element('h3','','รับชมทาง'); platformTitle.id = 'platforms-title'; platforms.append(platformTitle);
    if (item.platforms?.length) {
      const list = element('ul','platform-list');
      for (const platform of item.platforms) {
        const row = element('li','platform-row');
        const link = element('a','platform-detail-link'); link.href = platform.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const mark = element('span','platform-icon'); mark.setAttribute('aria-hidden','true');
        const fallback = element('span','platform-fallback','▶');
        if (platform.brand) mark.append(element('span',`platform-logo brand-${platform.brand}`));
        else if (platform.icon) { const img = element('img'); img.src = platform.icon; img.width = 20; img.height = 20; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.addEventListener('error',() => { img.hidden = true; }); mark.append(img); }
        mark.append(fallback); link.append(mark,element('span','',platform.site),element('span','platform-external','↗'));
        link.setAttribute('aria-label',`รับชมทาง ${platform.site} (เปิดแท็บใหม่)`); row.append(link);
        if (platform.notes) {
          // Display verbatim notes, including any restrictions or negation; never infer SUB/DUB from language.
          row.append(element('p','platform-meta',`${platform.noteLabel || 'หมายเหตุ'}: ${platform.notes}`));
        }
        if (platform.language) row.append(element('p','platform-meta',`ภาษาที่แหล่งข้อมูลระบุ: ${platform.language}`));
        list.append(row);
      }
      platforms.append(list,element('p','dialog-hint','ลิงก์ตาม AniList · การรับชมขึ้นกับพื้นที่และสิทธิ์ของแพลตฟอร์ม'));
    } else {
      platforms.append(element('p','platform-empty','ยังไม่มีข้อมูลช่องทางรับชมจาก AniList'));
    }
    content.append(platforms);
    const source = element('a','button dialog-source','ดูรายละเอียดบน AniList ↗'); source.href = item.url; source.target = '_blank'; source.rel = 'noopener noreferrer'; content.append(source);
    content.append(element('p','dialog-hint','เรื่องย่อและชื่อเรื่องตามข้อมูลต้นฉบับจาก AniList'));
    dialog.showModal(); document.body.style.overflow = 'hidden';
  });
  document.querySelector('.dialog-close').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
  dialog.addEventListener('close',() => { document.body.style.overflow = ''; opener?.focus(); });
  document.querySelector('[data-reload]')?.addEventListener('click',() => location.reload());
  // Missing initial data retries quickly; normal pages check only once per minute.
  let checking = false;
  async function checkUpdates() {
    if (document.hidden || checking) return;
    if (dayKey() !== document.body.dataset.day) { location.reload(); return; }
    checking = true;
    try {
      const result = await fetch(`/api/${document.body.dataset.page}`,{cache:'no-store'});
      if (result.ok) {
        const payload = await result.json();
        if (payload.updatedAt > Number(document.body.dataset.updated) && !dialog.open && document.activeElement !== search) location.reload();
      }
    } catch { /* Keep the working cached page while offline. */ }
    finally { checking = false; }
  }
  setInterval(() => { applyFilters(); void checkUpdates(); },60000);
  if (document.body.dataset.missing === 'true') setInterval(checkUpdates,5000);
  document.addEventListener('visibilitychange',() => { if (!document.hidden) { applyFilters(); void checkUpdates(); } });
  // Off-screen posters stay lazy and broken images degrade to a quiet icon-free placeholder.
  for (const image of document.querySelectorAll('.poster img')) image.addEventListener('error',() => { image.hidden = true; image.parentElement.setAttribute('aria-label','ไม่สามารถโหลดภาพปก'); });
  for (const image of document.querySelectorAll('.platform-icon img')) {
    const fallback = () => { image.hidden = true; };
    image.addEventListener('error',fallback);
    if (image.complete && image.naturalWidth === 0) fallback();
  }
})();
