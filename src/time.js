export const TIME_ZONE = 'Asia/Bangkok';
export const DAY = 86400;
const OFFSET = 7 * 3600;
export function dayKey(value = Date.now()) {
  return new Date(value + OFFSET * 1000).toISOString().slice(0, 10);
}
export function weekWindow(now = Date.now()) {
  const key = dayKey(now);
  const start = Date.parse(`${key}T00:00:00+07:00`) / 1000;
  return { start, end: start + 7 * DAY, key };
}
export function nextSeason(now = Date.now()) {
  const date = new Date(now + OFFSET * 1000);
  const quarter = Math.floor(date.getUTCMonth() / 3);
  const index = (quarter + 1) % 4;
  return { season: ['WINTER', 'SPRING', 'SUMMER', 'FALL'][index], year: date.getUTCFullYear() + (index === 0 ? 1 : 0), months: ['มกราคม — มีนาคม', 'เมษายน — มิถุนายน', 'กรกฎาคม — กันยายน', 'ตุลาคม — ธันวาคม'][index] };
}
export function weekDays(now = Date.now()) {
  const { start } = weekWindow(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date((start + index * DAY) * 1000);
    return { key: dayKey(date.getTime()), timestamp: date.getTime(), short: new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: TIME_ZONE }).format(date), number: new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: TIME_ZONE }).format(date), label: new Intl.DateTimeFormat('th-TH-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE }).format(date) };
  });
}
export const thaiTime = timestamp => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(new Date(timestamp * 1000));
