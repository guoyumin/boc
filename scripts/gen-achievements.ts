/**
 * docs/achievements.tsv → src/db/achievements-data.ts
 *
 * 用法：npm run gen:achievements
 *
 * TSV 是成就清单的唯一数据源（用户从飞书导出覆盖它）。改完数据一定要重跑这个脚本，
 * 生成的 TS 文件要提交进 git —— seed 只读生成出来的文件，不读 TSV。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "docs/achievements.tsv");
const OUT = path.join(ROOT, "src/db/achievements-data.ts");

const COLUMNS = [
  "role",
  "name",
  "condition",
  "stars",
  "first_date",
  "first_date_note",
  "first_player",
] as const;

type Row = {
  role: string;
  name: string;
  condition: string;
  stars: number;
  firstDate: string | null;
  firstDateNote: string | null;
  firstPlayer: string | null;
};

function fail(line: number, msg: string): never {
  console.error(`[gen:achievements] docs/achievements.tsv 第 ${line} 行：${msg}`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`[gen:achievements] 找不到数据源 ${SRC}`);
    process.exit(1);
  }
  // 去掉 BOM；\r\n 与 \n 都当换行
  const raw = fs.readFileSync(SRC, "utf8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/);

  const header = (lines[0] ?? "").split("\t").map((s) => s.trim());
  if (header.length !== COLUMNS.length || COLUMNS.some((c, i) => header[i] !== c)) {
    console.error(
      `[gen:achievements] 表头不对。期望 ${COLUMNS.join(" / ")}，实际 ${header.join(" / ") || "（空）"}`,
    );
    process.exit(1);
  }

  const rows: Row[] = [];
  const seenNames = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    if (line.trim() === "") continue; // 空行（含结尾空行）直接跳过

    const cells = line.split("\t");
    if (cells.length !== COLUMNS.length) {
      fail(lineNo, `应该有 ${COLUMNS.length} 列（制表符分隔），实际 ${cells.length} 列：${line}`);
    }
    // 只 trim 首尾空白，中文全角引号等字符原样保留
    const [role, name, condition, starsRaw, firstDate, firstDateNote, firstPlayer] = cells.map((c) =>
      c.trim(),
    );

    if (!role) fail(lineNo, "角色（role）不能为空");
    if (!name) fail(lineNo, "成就名称（name）不能为空");
    if (!condition) fail(lineNo, "达成条件（condition）不能为空");
    if (seenNames.has(name)) fail(lineNo, `成就名称重复：${name}（名称在数据库里是唯一键）`);
    seenNames.add(name);

    const stars = Number(starsRaw);
    if (!starsRaw || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      fail(lineNo, `稀有度（stars）必须是 1–5 的整数，实际是「${starsRaw}」`);
    }
    if (firstDate && !/^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
      fail(lineNo, `首次达成日期（first_date）要写成 YYYY-MM-DD，实际是「${firstDate}」`);
    }
    if (!firstPlayer && (firstDate || firstDateNote)) {
      fail(lineNo, "填了首次达成日期 / 说明，却没有填首位达成者（first_player）");
    }

    rows.push({
      role,
      name,
      condition,
      stars,
      firstDate: firstDate || null,
      firstDateNote: firstDateNote || null,
      firstPlayer: firstPlayer || null,
    });
  }

  if (rows.length === 0) {
    console.error("[gen:achievements] 数据源里一条成就都没有");
    process.exit(1);
  }

  const q = (v: string | null) => (v === null ? "null" : JSON.stringify(v));
  const body = rows
    .map(
      (r) =>
        `  {\n` +
        `    role: ${q(r.role)},\n` +
        `    name: ${q(r.name)},\n` +
        `    condition: ${q(r.condition)},\n` +
        `    stars: ${r.stars},\n` +
        `    firstDate: ${q(r.firstDate)},\n` +
        `    firstDateNote: ${q(r.firstDateNote)},\n` +
        `    firstPlayer: ${q(r.firstPlayer)},\n` +
        `  },`,
    )
    .join("\n");

  const out = `// ⚠️ 本文件由 scripts/gen-achievements.ts 自动生成，请勿手改。
// 要改成就数据，请改 docs/achievements.tsv（唯一数据源），然后跑 npm run gen:achievements。

export type AchievementSeed = {
  /** 角色名，如 通用 / 厨师 / 麻脸巫婆 */
  role: string;
  /** 成就名称，数据库里是唯一键 */
  name: string;
  /** 达成条件 */
  condition: string;
  /** 稀有度 1–5，星数即积分 */
  stars: number;
  /** 首次达成日期 YYYY-MM-DD */
  firstDate: string | null;
  /** 日期不详时的说明，如「已不可考」 */
  firstDateNote: string | null;
  /** 首位达成者昵称 */
  firstPlayer: string | null;
};

export const ACHIEVEMENT_SEEDS: readonly AchievementSeed[] = [
${body}
];
`;

  fs.writeFileSync(OUT, out, "utf8");
  const roles = [...new Set(rows.map((r) => r.role))];
  const withPlayer = rows.filter((r) => r.firstPlayer).length;
  console.log(
    `[gen:achievements] 已生成 src/db/achievements-data.ts：` +
      `${rows.length} 条成就 / ${roles.length} 个角色 / ${withPlayer} 条有首位达成者`,
  );
}

main();
