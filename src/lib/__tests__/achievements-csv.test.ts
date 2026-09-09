import { describe, expect, it } from "vitest";
import {
  normalizeAchievementName,
  parseAchievementsTable,
  parseDelimited,
  rarityToStars,
  starsToRarity,
  toDelimited,
} from "../achievements-csv";

describe("parseDelimited", () => {
  it("引号里的逗号、换行和转义引号都不算分隔", () => {
    const rows = parseDelimited('a,b\n"逗,号","换\n行"\n"她说""好"",", x', ",");
    expect(rows).toEqual([
      ["a", "b"],
      ["逗,号", "换\n行"],
      ['她说"好",', " x"],
    ]);
  });

  it("吃掉 BOM 和 CRLF，跳过全空行", () => {
    expect(parseDelimited("﻿a\tb\r\n\r\n1\t2\r\n", "\t")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("starsToRarity", () => {
  it("1–2 星并成普通，往上一星一档", () => {
    expect([1, 2, 3, 4, 5].map(starsToRarity)).toEqual([
      "common",
      "common",
      "rare",
      "epic",
      "legendary",
    ]);
  });

  it("反过来导出时普通只能还原成 1 星", () => {
    expect(["common", "rare", "epic", "legendary"].map(rarityToStars)).toEqual([1, 3, 4, 5]);
  });
});

describe("normalizeAchievementName", () => {
  it("全角引号、大小写和多余空格都不影响判重", () => {
    expect(normalizeAchievementName(" “无恶不做” ")).toBe(normalizeAchievementName('"无恶不做"'));
    expect(normalizeAchievementName("Good  Job")).toBe(normalizeAchievementName("good job"));
  });
});

describe("parseAchievementsTable", () => {
  const TSV = [
    "role\tname\tcondition\tstars",
    "厨师\t首夜零对\t首夜得知 0 对邪恶相邻\t3",
    "麻脸巫婆\t变身\t把人变成别的角色\t5",
    "\t没角色的\t随便\t1",
  ].join("\n");

  it("认 docs/achievements.tsv 那套表头，星数换算成档位，角色留空按通用", () => {
    const r = parseAchievementsTable(TSV);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => [x.name, x.role, x.rarity])).toEqual([
      ["首夜零对", "厨师", "rare"],
      ["变身", "麻脸巫婆", "legendary"],
      ["没角色的", "通用", "common"],
    ]);
  });

  it("库里已有的名字标成 exists，文件里自己重复的标成 dup", () => {
    const text = "name,stars\n甲,3\n甲,4\n乙,3";
    const r = parseAchievementsTable(text, ["  甲  "]);
    expect(r.rows.map((x) => x.skip)).toEqual(["exists", "exists", null]);

    const r2 = parseAchievementsTable(text, []);
    expect(r2.rows.map((x) => x.skip)).toEqual([null, "dup", null]);
  });

  it("非官方角色不拦，只在预览里提醒", () => {
    const r = parseAchievementsTable("name,role\n甲,自制角色");
    expect(r.rows[0].skip).toBeNull();
    expect(r.rows[0].warnings[0]).toContain("不是官方角色名");
  });

  it("坏行给行号和原因，好行照常导", () => {
    const r = parseAchievementsTable("name,stars\n甲,3\n,4\n丙,9\n丁,x");
    expect(r.rows.map((x) => x.name)).toEqual(["甲"]);
    expect(r.errors).toEqual([
      { line: 3, reason: "成就名称是空的" },
      { line: 4, reason: "星数要是 1–5 的整数，实际是「9」" },
      { line: 5, reason: "星数要是 1–5 的整数，实际是「x」" },
    ]);
  });

  it("没有成就名称那一列就整份报错，不猜", () => {
    const r = parseAchievementsTable("角色,条件\n厨师,随便");
    expect(r.rows).toEqual([]);
    expect(r.errors[0].reason).toContain("必须是表头");
  });

  it("认得中文表头，不认得的列会列出来", () => {
    const r = parseAchievementsTable("成就名称,角色,稀有度,备注\n甲,厨师,4,谁写的");
    expect(r.rows[0]).toMatchObject({ name: "甲", role: "厨师", rarity: "epic" });
    expect(r.ignored).toEqual(["备注"]);
  });

  it("上架 / 隐藏认 0 1 是 否", () => {
    const r = parseAchievementsTable("name,hidden,active\n甲,是,否\n乙,1,1\n丙,,");
    expect(r.rows.map((x) => [x.hidden, x.active])).toEqual([
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
  });
});

describe("toDelimited", () => {
  it("种子 TSV 不带 BOM、用 LF，免得覆盖回仓库时整个文件都算改过", () => {
    const out = toDelimited([["a", "b"], [1, 2]], "\t", { bom: false, eol: "\n" });
    expect(out).toBe("a\tb\n1\t2\n");
  });

  it("带 BOM，字段里的引号和分隔符会转义", () => {
    const out = toDelimited(
      [
        ["name", "note"],
        ['说"好"', "逗,号"],
        [1, null],
      ],
      ",",
    );
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain('"说""好""",\"逗,号\"');
    expect(out).toContain("1,\r\n");
  });
});
