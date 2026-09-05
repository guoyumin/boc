const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** 用本地时间构造 Date，避免 new Date("2026-09-07") 被当成 UTC 造成时区偏移。 */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

export function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

export function weekdayCn(ymd: string): string {
  return WEEKDAYS[parseYmd(ymd).getDay()];
}

/** "2026-09-07" → "9月7日" */
export function formatMd(ymd: string): string {
  const d = parseYmd(ymd);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** "2026-09-07" → "9月7日（周日）" */
export function formatDate(ymd: string): string {
  return `${formatMd(ymd)}（${weekdayCn(ymd)}）`;
}

/** 周六日期 → "9月6日–7日 时间投票"；跨月时 → "9月30日–10月1日 时间投票" */
export function pollTitle(saturday: string): string {
  return `${weekendRange(saturday)} 时间投票`;
}

/** 周六日期 → "9月6日–7日"；跨月时 → "9月30日–10月1日" */
export function weekendRange(saturday: string): string {
  const sun = addDays(saturday, 1);
  const a = parseYmd(saturday);
  const b = parseYmd(sun);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getMonth() + 1}月${a.getDate()}日–${b.getDate()}日`;
  }
  return `${formatMd(saturday)}–${formatMd(sun)}`;
}

/** 最近的一个周六（今天就是周六则返回今天） */
export function nextSaturday(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return toYmd(d);
}

export function isPast(ymd: string): boolean {
  return ymd < todayYmd();
}

export function isFuture(ymd: string): boolean {
  return ymd >= todayYmd();
}

/** 日期或 ISO 时间戳 → "11月29日"；不是今年则带上年份 "2025年11月29日" */
export function formatDay(value: string): string {
  const ymd = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = parseYmd(ymd);
  const year = d.getFullYear() === new Date().getFullYear() ? "" : `${d.getFullYear()}年`;
  return `${year}${d.getMonth() + 1}月${d.getDate()}日`;
}

/** ISO 时间戳（UTC）→ "9月5日" */
export function formatStamp(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
