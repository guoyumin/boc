import { describe, expect, it } from "vitest";
import { isLate, isNoShow, sessionSplit } from "../labels";

describe("isNoShow / isLate", () => {
  it("报了名没到是鸽；迟到的人到了，不算鸽（issue #1）", () => {
    expect(isNoShow({ signup: "full", attended: "none" })).toBe(true);
    expect(isNoShow({ signup: "full", attended: "afternoon", late: 1 })).toBe(false);
    expect(isLate({ signup: "full", attended: "afternoon", late: 1 })).toBe(true);
  });

  it("「未到 + 迟到」说不通，这种脏数据不算迟到", () => {
    expect(isLate({ signup: "full", attended: "none", late: 1 })).toBe(false);
  });

  it("候补、免鸽都不算鸽", () => {
    expect(isNoShow({ signup: "full", attended: "none", status: "waitlist" })).toBe(false);
    expect(isNoShow({ signup: "full", attended: "none", noShowWaived: 1 })).toBe(false);
    expect(isNoShow({ signup: "full", attended: "none", status: "cancelled" })).toBe(true);
  });
});

describe("sessionSplit", () => {
  it("全天两边都算，候补和已取消不算（issue #57）", () => {
    const rows = [
      { signup: "afternoon", attended: "none", status: "active" },
      { signup: "evening", attended: "none", status: "active" },
      { signup: "full", attended: "none", status: "active" },
      { signup: "full", attended: "none", status: "waitlist" },
      { signup: "evening", attended: "none", status: "cancelled" },
      { signup: "none", attended: "full", status: "active" },
    ];
    expect(sessionSplit(rows)).toEqual({ afternoon: 2, evening: 2 });
  });
});
