/**
 * 行为事件（GA4）。事件名和参数都定在这里，改文案不会碰坏统计。
 *
 * 漏斗：主页 → play → 打开活动页 → 报名成功 → 打开时间投票 → 投票成功；
 * 外加板子投票、分享按钮。页面加载类的用 <Track>，Server Action 成功后的
 * 走 redirect 上的 ?ev= 标记，由 <TrackFromQuery> 在落地页上报一次。
 *
 * 报名叫 rsvp 不叫 signup：GA4 的推荐事件 sign_up 是「注册账号」，别撞。
 */
export type TrackEvent =
  | { name: "view_event"; params: { event_id: number } }
  | { name: "rsvp_success"; params: { event_id: number; session: string; waitlisted: boolean } }
  | { name: "rsvp_cancel"; params: { event_id: number } }
  | { name: "view_poll"; params: { poll_id: number } }
  | { name: "poll_fill_success"; params: { poll_id: number; slot_count: number } }
  | { name: "script_vote_success"; params: { poll_id: number; event_id: number | null; option_count: number } }
  | { name: "share_copy"; params: { kind: "link" | "jielong" } };

export type TrackParams = Record<string, string | number | boolean | null>;

/** 把事件塞进 URL：`ev=rsvp_success&ev_event_id=3&ev_session=full` */
export function trackQuery(ev: TrackEvent): string {
  const q = new URLSearchParams({ ev: ev.name });
  for (const [k, v] of Object.entries(ev.params)) {
    if (v !== null && v !== undefined) q.set(`ev_${k}`, String(v));
  }
  return q.toString();
}

/** 从 URL 里把事件读回来；没有 ev 就返回 null */
export function trackFromQuery(search: URLSearchParams): { name: string; params: TrackParams } | null {
  const name = search.get("ev");
  if (!name) return null;
  const params: TrackParams = {};
  for (const [k, v] of search) {
    if (!k.startsWith("ev_")) continue;
    // 数字和布尔还原回去，GA 里才能当数值维度用
    params[k.slice(3)] = v === "true" ? true : v === "false" ? false : /^-?\d+$/.test(v) ? Number(v) : v;
  }
  return { name, params };
}

/**
 * 群里分享出去的链接打上 UTM。微信内置浏览器打开链接不带 referrer，
 * GA 看到的和直接输网址一样，不打标就分不出「群里点进来的」。
 */
export function withUtm(url: string, medium: "share" | "jielong"): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "wechat");
  u.searchParams.set("utm_medium", medium);
  return u.toString();
}
