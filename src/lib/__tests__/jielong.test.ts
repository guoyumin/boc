import { describe, expect, it } from "vitest";
import { buildJielong, parseJielong } from "../jielong";
import { formatDate, nextSaturday, pollTitle, weekendRange, addDays, weekdayCn } from "../dates";

const SAMPLE = `#接龙 9月7日 血染钟楼（下午场）
1. 清扬 （晚上补位）
2、枫染柒萋 下午场 感冒好了就来
3. Crystal🍀
4、
5. 老王（全天）
6. 小林`;

describe("parseJielong", () => {
  const r = parseJielong(SAMPLE, "afternoon");

  it("跳过 #接龙 行、标题行与占位行", () => {
    expect(r.rows.map((x) => x.name)).toEqual([
      "清扬",
      "枫染柒萋",
      "Crystal🍀",
      "老王",
      "小林",
    ]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].reason).toContain("占位");
  });

  it("从备注识别场次", () => {
    const by = Object.fromEntries(r.rows.map((x) => [x.name, x]));
    expect(by["清扬"].session).toBe("evening");
    expect(by["清扬"].note).toBe("晚上补位");
    expect(by["枫染柒萋"].session).toBe("afternoon");
    expect(by["枫染柒萋"].note).toBe("下午场 感冒好了就来");
    expect(by["老王"].session).toBe("full");
  });

  it("没有备注时用默认场次，且保留 emoji 昵称", () => {
    const by = Object.fromEntries(r.rows.map((x) => [x.name, x]));
    expect(by["Crystal🍀"].session).toBe("afternoon");
    expect(by["Crystal🍀"].note).toBe("");
    expect(by["小林"].session).toBe("afternoon");
  });

  it("序号保留原文顺序", () => {
    expect(r.rows.map((x) => x.seq)).toEqual([1, 2, 3, 5, 6]);
  });

  it("重复昵称保留最后一条", () => {
    const d = parseJielong("接龙\n1. 老王\n2. 老王 晚上", "afternoon");
    expect(d.rows).toHaveLength(1);
    expect(d.rows[0].session).toBe("evening");
    expect(d.skipped[0].reason).toContain("重复");
  });

  it("空文本不炸", () => {
    expect(parseJielong("", "full").rows).toEqual([]);
  });
});

describe("dates", () => {
  it("formatDate", () => {
    // 注意：2026-09-05 是周六，因此周日是 09-06（需求文档举例里的 9月6日–7日/9月7日周日
    // 与真实日历对不上，这里以真实日历为准）
    expect(formatDate("2026-09-06")).toBe("9月6日（周日）");
    expect(weekdayCn("2026-09-05")).toBe("周六");
  });
  it("weekendRange / pollTitle", () => {
    expect(weekendRange("2026-09-05")).toBe("9月5日–6日");
    expect(weekendRange("2026-10-31")).toBe("10月31日–11月1日");
    expect(pollTitle("2026-09-05")).toBe("9月5日–6日 时间投票");
  });
  it("nextSaturday 今天是周六就返回今天", () => {
    expect(nextSaturday(new Date(2026, 8, 5))).toBe("2026-09-05");
    expect(nextSaturday(new Date(2026, 8, 6))).toBe("2026-09-12");
    expect(addDays("2026-09-05", 1)).toBe("2026-09-06");
  });
});

describe("buildJielong 带报名链接", () => {
  it("链接放在标题下一行，粘贴回来解析时被忽略", () => {
    const text = buildJielong(
      "#接龙 9月20日 血染钟楼（14:00）",
      [{ name: "张三", note: "下午" }, { name: "李四" }],
      "https://play.zurich-boca.party/events/3",
    );
    expect(text.split("\n")[1]).toBe("报名：https://play.zurich-boca.party/events/3");
    const r = parseJielong(text);
    expect(r.rows.map((x) => x.name)).toEqual(["张三", "李四"]);
    expect(r.skipped).toEqual([]);
  });
});
