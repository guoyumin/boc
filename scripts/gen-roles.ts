/**
 * 官方角色表 → src/lib/roles-data.ts + public/roles/<id>.webp
 *
 * 用法：npm run gen:roles       （只补缺的图标）
 *       npm run gen:roles -- --force  （所有图标重新下载处理）
 *
 * 数据全部来自 The Pandemonium Institute 自己的仓库，不用社区二手整理：
 * - 角色表（英文 id / team / edition）：botc-release/resources/data/roles.json
 * - 简体中文名：botc-translations/game/zh_Hans.json
 * - 角色美术：botc-release/resources/characters/<edition>/<id>[_g|_e].webp
 *
 * 生成的 src/lib/roles-data.ts 要提交进 git —— 运行时不联网，也不读这个脚本。
 * public/roles/generic.webp 是我们自己的门环纹样（单色遮罩图），脚本不碰它。
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_TS = path.join(ROOT, "src/lib/roles-data.ts");
const OUT_ICONS = path.join(ROOT, "public/roles");

const RELEASE = "https://raw.githubusercontent.com/ThePandemoniumInstitute/botc-release/main";
const ROLES_URL = `${RELEASE}/resources/data/roles.json`;
const ZH_URL =
  "https://raw.githubusercontent.com/ThePandemoniumInstitute/botc-translations/main/game/zh_Hans.json";

/** 官方把角色分成七类，站内只关心红蓝，其余归到「不分阵营」 */
const TEAMS = ["townsfolk", "outsider", "minion", "demon", "traveller", "fabled", "loric"] as const;
type Team = (typeof TEAMS)[number];

type OfficialRole = { id: string; name: string; team: string; edition: string };

/**
 * 角色美术分好人版（蓝）和坏人版（红），同一张画换个颜色。
 * 镇民 / 外来者取蓝，爪牙 / 恶魔取红；旅行者两版都有（阵营不固定）、
 * 传奇和 loric 只有一版，都取不带后缀的那张。
 */
function artSuffix(team: Team): string {
  if (team === "townsfolk" || team === "outsider") return "_g";
  if (team === "minion" || team === "demon") return "_e";
  return "";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function main() {
  const force = process.argv.includes("--force");

  const [roles, zh] = await Promise.all([
    getJson<OfficialRole[]>(ROLES_URL),
    getJson<{ roles: Record<string, { name: string }> }>(ZH_URL),
  ]);

  const rows: { id: string; zh: string; team: Team; edition: string }[] = [];
  const noZh: string[] = [];
  for (const r of roles) {
    const name = zh.roles[r.id]?.name;
    // 官方还没翻译的角色先不收：没有中文名就进不了下拉框，也对不上成就里的角色
    if (!name) {
      noZh.push(r.id);
      continue;
    }
    if (!(TEAMS as readonly string[]).includes(r.team)) {
      throw new Error(`没见过的阵营 ${r.team}（${r.id}），先确认要不要归到红蓝里再改脚本`);
    }
    rows.push({ id: r.id, zh: name, team: r.team as Team, edition: r.edition });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));

  const dupes = [...new Set(rows.map((r) => r.zh))].length !== rows.length;
  if (dupes) throw new Error("中文角色名有重复，成就里按中文名存角色，重名会对不上图标");

  fs.mkdirSync(OUT_ICONS, { recursive: true });
  let downloaded = 0;
  for (const r of rows) {
    const dest = path.join(OUT_ICONS, `${r.id}.webp`);
    if (!force && fs.existsSync(dest)) continue;
    const url = `${RELEASE}/resources/characters/${r.edition}/${r.id}${artSuffix(r.team)}.webp`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`下载 ${r.id} 图标失败：${url} → HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // 官方原图 400px 且四周留白很多，trim 掉再统一到 128px，跟已有的图标一致
    await sharp(buf)
      .trim()
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(dest);
    downloaded++;
  }

  const q = (v: string) => JSON.stringify(v);
  const body = rows
    .map((r) => `  { id: ${q(r.id)}, zh: ${q(r.zh)}, team: ${q(r.team)} },`)
    .join("\n");
  const out = `// ⚠️ 本文件由 scripts/gen-roles.ts 自动生成，请勿手改。
// 数据源是 The Pandemonium Institute 的官方仓库（角色表 botc-release、中文名 botc-translations），
// 图标同步下载到 public/roles/<id>.webp。加了新角色就重跑 npm run gen:roles。

/** 官方的七类角色。站内只把镇民/外来者算蓝方、爪牙/恶魔算红方，其余不分阵营。 */
export type RoleTeam = ${TEAMS.map(q).join(" | ")};

export type OfficialRole = {
  /** 官方英文 id，也是 public/roles/<id>.webp 的文件名 */
  id: string;
  /** 官方简体中文名，成就表里存的就是这个 */
  zh: string;
  team: RoleTeam;
};

export const OFFICIAL_ROLES: readonly OfficialRole[] = [
${body}
];
`;
  fs.writeFileSync(OUT_TS, out, "utf8");

  const byTeam = TEAMS.map((t) => `${t} ${rows.filter((r) => r.team === t).length}`).join(" / ");
  console.log(
    `[gen:roles] 已生成 src/lib/roles-data.ts：${rows.length} 个角色（${byTeam}）\n` +
      `[gen:roles] 图标：新处理 ${downloaded} 个，public/roles 下共 ${
        fs.readdirSync(OUT_ICONS).filter((f) => f.endsWith(".webp")).length
      } 个`,
  );
  if (noZh.length > 0) {
    console.log(`[gen:roles] 官方还没有中文名，已跳过 ${noZh.length} 个：${noZh.join(", ")}`);
  }
}

main().catch((e) => {
  console.error(`[gen:roles] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
