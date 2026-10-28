// Shared by server rendering and the browser so time-boundary states stay consistent.
export function airingState(airingAt, duration, now = Date.now()) {
  const start = Number(airingAt) * 1000;
  const minutes = Number(duration);
  if (!Number.isFinite(start) || start > now) return { state: 'upcoming', label: 'กำลังจะฉาย', hint: '' };
  if (!Number.isFinite(minutes) || minutes <= 0) return { state: 'started', label: 'เริ่มฉายแล้ว', hint: 'ต้นทางยังไม่ระบุความยาวตอน จึงยืนยันช่วงกำลังฉายไม่ได้' };
  if (now < start + minutes * 60000) return { state: 'live', label: 'กำลังฉาย', hint: 'ประเมินจากเวลาเริ่มและความยาวตอนของ AniList' };
  return { state: 'aired', label: 'ฉายแล้ว', hint: '' };
}
export function nextAiringTime(values, now = Date.now()) {
  let next = null;
  for (const value of values) {
    const time = Number(value);
    if (Number.isFinite(time) && time * 1000 > now && (next === null || time < next)) next = time;
  }
  return next;
}
