import { describe, expect, it } from "vitest";
import { trackFromQuery, trackQuery, withUtm } from "../analytics";
import { withMsg } from "../form";

describe("行为事件在 URL 上的来回", () => {
  it("withMsg 带事件时追加 ev= 和 ev_ 参数", () => {
    const url = withMsg("/events/3", "报名成功", "ok", {
      name: "rsvp_success",
      params: { event_id: 3, session: "full", waitlisted: false },
    });
    expect(url).toBe("/events/3?ok=%E6%8A%A5%E5%90%8D%E6%88%90%E5%8A%9F&ev=rsvp_success&ev_event_id=3&ev_session=full&ev_waitlisted=false");
  });

  it("读回来时数字和布尔恢复类型，null 的参数不带", () => {
    const q = trackQuery({
      name: "script_vote_success",
      params: { poll_id: 2, event_id: null, option_count: 3 },
    });
    expect(q).toBe("ev=script_vote_success&ev_poll_id=2&ev_option_count=3");
    expect(trackFromQuery(new URLSearchParams(q))).toEqual({
      name: "script_vote_success",
      params: { poll_id: 2, option_count: 3 },
    });
    expect(trackFromQuery(new URLSearchParams("ok=x"))).toBeNull();
  });

  it("没传事件的 withMsg 和以前一模一样", () => {
    expect(withMsg("/events/3", "出错了")).toBe("/events/3?err=%E5%87%BA%E9%94%99%E4%BA%86");
  });
});

describe("withUtm", () => {
  it("分享链接打上微信来源，已有的 query 保留", () => {
    expect(withUtm("https://play.zurich-boca.party/events/3", "share")).toBe(
      "https://play.zurich-boca.party/events/3?utm_source=wechat&utm_medium=share",
    );
    expect(withUtm("https://play.zurich-boca.party/polls/2?x=1", "jielong")).toBe(
      "https://play.zurich-boca.party/polls/2?x=1&utm_source=wechat&utm_medium=jielong",
    );
  });
});
