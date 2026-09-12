/**
 * 成就的表格导入导出（issue #54）。纯函数，客户端也 import 得到——
 * 导入的预览在浏览器里跑，服务端再用同一套规则校一遍，两边结论一致。
 *
 * 导入**只新增**：名字已经在库里的直接跳过，不改、不删。
 * 改成就仍然走后台单条编辑，删成就仍然一条条点——批量删太危险
 * （删成就会级联删掉所有宣告记录）。
 */
import { RARITIES, type Rarity } from "@/db/schema";
import { asRarity } from "@/lib/labels";
import { GENERIC_ROLE, canonicalRole, isOfficialRole } from "@/lib/roles";

/**
 * 星数 → 四档稀有度。飞书底稿里稀有度是 1–5 星，站内是四档。
 * 种子（scripts/gen-achievements.ts）和 CSV 导入共用这一个函数，
 * 保证两条路径永远一致。注意 1 星和 2 星都落在「普通」。
 */
export function starsToRarity(stars: number): Rarity {
  if (stars >= 5) return "legendary";
  if (stars === 4) return "epic";
  if (stars === 3) return "rare";
  return "common";
}

/** 实心星：数它们的个数。⭐ 后面常跟一个 U+FE0F 变体选择符，先去掉 */
const FILLED_STAR = /[⭐★✦✭✮🌟]/gu;
/** 空心星：「★★★☆☆」这种评分写法里占位用的，不算数 */
const HOLLOW_STAR = /[☆✩✧]/gu;
const CN_DIGIT: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5 };

/**
 * 星数那一格可以写成 `4`、`4星`、`四星`、`⭐⭐⭐⭐`、`★★★★☆`（issue #62）。
 * 认不出来返回 null，由调用方报错。
 */
export function parseStars(cell: string): number | null {
  const v = cell.replace(/[\s\uFE0F]/g, "");
  if (v === "") return null;

  const filled = (v.match(FILLED_STAR) ?? []).length;
  if (filled > 0 && v.replace(FILLED_STAR, "").replace(HOLLOW_STAR, "") === "") return filled;

  const m = /^([1-5]|[一二两三四五])(星|颗星)?$/u.exec(v);
  if (!m) return null;
  return CN_DIGIT[m[1]] ?? Number(m[1]);
}

/** 反过来给导出用；普通只能还原成 1 星（1★ 和 2★ 进来时就并档了） */
export function rarityToStars(rarity: string): number {
  return { common: 1, rare: 3, epic: 4, legendary: 5 }[asRarity(rarity)];
}

/**
 * 成就名归一化，只用来判重。
 * 「“无恶不做”」这种带全角引号的名字，从文档里复制出来引号方向、半角全角
 * 都可能变，不归一化就会当成新成就重复插进去（这个坑踩过一次）。
 */
export function normalizeAchievementName(s: string): string {
  return s
    .trim()
    .replace(/[“”‘’]/g, '"')
    .replace(/[\s　]+/g, " ")
    .toLowerCase();
}

/** RFC4180 的 CSV / TSV 解析。带引号的字段里可以有分隔符、换行和转义的引号。 */
export function parseDelimited(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"' && field === "") {
      quoted = true;
    } else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Excel 存的是 CSV、飞书复制出来的是 TSV，按表头那行有没有制表符判断 */
export function detectSeparator(text: string): string {
  const first = text.replace(/^﻿/, "").split(/\r?\n/)[0] ?? "";
  return first.includes("\t") ? "\t" : ",";
}

/**
 * 表头别名。导出的 CSV、docs/achievements.tsv 的表头、以及中文表头都能直接导。
 * 比较时会去掉空格并转小写。
 */
const ALIASES: Record<string, string[]> = {
  name: ["name", "成就", "成就名", "成就名称", "名称", "标题"],
  description: ["description", "condition", "达成条件", "条件", "描述", "说明"],
  role: ["role", "角色"],
  rarity: ["rarity", "稀有度档位"],
  stars: ["stars", "星数", "星级", "稀有度"],
  scriptName: ["script_name", "scriptname", "剧本", "剧本专属"],
  hidden: ["hidden", "隐藏"],
  active: ["active", "上架", "启用"],
  sortOrder: ["sort_order", "sortorder", "排序"],
};

function headerKey(cell: string): string | null {
  const v = cell.trim().replace(/\s+/g, "").toLowerCase();
  for (const [key, names] of Object.entries(ALIASES)) {
    if (names.includes(v)) return key;
  }
  return null;
}

const TRUTHY = new Set(["1", "true", "yes", "y", "是", "√", "✓"]);
const FALSY = new Set(["", "0", "false", "no", "n", "否", "×"]);

export type ImportRow = {
  /** CSV 里的行号，报错时给人对着看 */
  line: number;
  name: string;
  description: string;
  role: string;
  rarity: Rarity;
  scriptName: string | null;
  hidden: number;
  active: number;
  sortOrder: number | null;
  /** 库里已有同名 / 这份文件里前面已经有同名 → 跳过不导 */
  skip: "exists" | "dup" | null;
  /** 不拦，但要在预览里提醒（比如非官方角色名） */
  warnings: string[];
};

export type ImportError = { line: number; reason: string };

export type ImportPreview = {
  rows: ImportRow[];
  errors: ImportError[];
  /** 认出来的列，用来在预览里告诉人「哪些列被忽略了」 */
  columns: string[];
  ignored: string[];
};

/**
 * 解析一份成就表。不抛异常：能认的行放进 rows，认不了的放进 errors，
 * 让人在预览里一次看完再决定导不导。
 */
export function parseAchievementsTable(text: string, existingNames: string[] = []): ImportPreview {
  const sep = detectSeparator(text);
  const table = parseDelimited(text, sep);
  if (table.length === 0) {
    return { rows: [], errors: [{ line: 1, reason: "文件是空的" }], columns: [], ignored: [] };
  }

  const header = table[0];
  const keys = header.map(headerKey);
  const columns = keys.filter((k): k is string => k !== null);
  const ignored = header.filter((h, i) => keys[i] === null && h.trim() !== "");
  if (!columns.includes("name")) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          reason: `第一行必须是表头，且要有「成就名称」这一列（表头可以写 name / 成就名称 / 标题）。现在读到的是：${
            header.join(" / ") || "（空）"
          }`,
        },
      ],
      columns,
      ignored,
    };
  }

  const taken = new Set(existingNames.map(normalizeAchievementName));
  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];

  for (let i = 1; i < table.length; i++) {
    const line = i + 1;
    const cells = table[i];
    const get = (key: string): string => {
      const at = keys.indexOf(key);
      return at >= 0 ? (cells[at] ?? "").trim() : "";
    };

    const name = get("name");
    if (!name) {
      errors.push({ line, reason: "成就名称是空的" });
      continue;
    }

    const warnings: string[] = [];
    // 官方写法优先：「诺达鲺」进来存成「诺-达鲺」，库里只留一种写法
    const role = canonicalRole(get("role"));
    if (role !== GENERIC_ROLE && !isOfficialRole(role)) {
      warnings.push(`「${role}」不是官方角色名，图标会用通用纹样，红蓝筛选里也不会出现`);
    }

    let rarity: Rarity | null = null;
    const rarityCell = get("rarity");
    const starsCell = get("stars");
    if (rarityCell) {
      if (!(RARITIES as readonly string[]).includes(rarityCell)) {
        errors.push({ line, reason: `稀有度只能是 ${RARITIES.join(" / ")}，实际是「${rarityCell}」` });
        continue;
      }
      rarity = rarityCell as Rarity;
    } else if (starsCell) {
      const stars = parseStars(starsCell);
      if (stars === null || stars < 1 || stars > 5) {
        errors.push({ line, reason: `星数要是 1–5 星（数字或 ⭐ 都行），实际是「${starsCell}」` });
        continue;
      }
      rarity = starsToRarity(stars);
    } else {
      rarity = "common";
      warnings.push("没写星数，按普通算");
    }

    const flag = (key: string, dflt: number): number | null => {
      const v = get(key).toLowerCase();
      if (v === "") return dflt;
      if (TRUTHY.has(v)) return 1;
      if (FALSY.has(v)) return 0;
      return null;
    };
    const hidden = flag("hidden", 0);
    const active = flag("active", 1);
    if (hidden === null || active === null) {
      errors.push({ line, reason: "隐藏 / 上架只能填 0 或 1（也认 是 / 否）" });
      continue;
    }

    const sortCell = get("sortOrder");
    let sortOrder: number | null = null;
    if (sortCell) {
      const n = Number(sortCell);
      if (!Number.isInteger(n)) {
        errors.push({ line, reason: `排序要是整数，实际是「${sortCell}」` });
        continue;
      }
      sortOrder = n;
    }

    const key = normalizeAchievementName(name);
    const skip = taken.has(key) ? "exists" : seen.has(key) ? "dup" : null;
    seen.add(key);

    rows.push({
      line,
      name,
      description: get("description"),
      role,
      rarity,
      scriptName: get("scriptName") || null,
      hidden,
      active,
      sortOrder,
      skip,
      warnings,
    });
  }

  return { rows, errors, columns, ignored };
}

/** 一个字段里有分隔符、引号或换行就得包起来 */
function csvCell(v: string | number | null, sep: string): string {
  const s = v === null ? "" : String(v);
  return new RegExp(`["\n${sep === "\t" ? "\\t" : sep}]`).test(s)
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/** 序列化。给人用 Excel 打开，**必须带 BOM 且用 CRLF**，不然中文全是乱码。 */
export function toDelimited(rows: (string | number | null)[][], sep: string): string {
  return "\ufeff" + rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join("\r\n") + "\r\n";
}
