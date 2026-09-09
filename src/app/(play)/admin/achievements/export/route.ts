/**
 * GET /admin/achievements/export           全量 CSV（Excel 直接打开）
 * GET /admin/achievements/export?format=tsv 种子 TSV（docs/achievements.tsv 的格式）
 *
 * 库是成就数据的权威，docs/achievements.tsv 只是空库首次导入用的种子，
 * 时间一长必然漂。导出 TSV 就是为了把种子文件同步回来（issue #54）。
 */
import { getAdmin } from "@/lib/auth";
import { rarityToStars, toDelimited } from "@/lib/achievements-csv";
import { confirmedUnlockMap, listAchievements } from "@/lib/queries";

export async function GET(req: Request): Promise<Response> {
  if (!(await getAdmin())) return new Response("需要管理员权限", { status: 403 });

  const tsv = new URL(req.url).searchParams.get("format") === "tsv";
  const list = listAchievements(true);
  const unlocks = confirmedUnlockMap();
  // 首解者：confirmedUnlockMap 已经按解锁时间升序排好，「已不可考」沉底
  const first = (id: number) => (unlocks.get(id) ?? [])[0] ?? null;

  const rows: (string | number | null)[][] = tsv
    ? [
        ["role", "name", "condition", "stars", "first_date", "first_date_note", "first_player"],
        ...list.map((a) => {
          const f = first(a.id);
          return [
            a.role,
            a.name,
            a.description,
            rarityToStars(a.rarity),
            f && !f.unlockedAtText ? f.unlockedAt.slice(0, 10) : "",
            f?.unlockedAtText ?? "",
            f?.name ?? "",
          ];
        }),
      ]
    : [
        [
          "id",
          "name",
          "description",
          "role",
          "rarity",
          "stars",
          "script_name",
          "hidden",
          "sort_order",
          "active",
          "unlock_count",
          "first_player",
          "first_date",
          "updated_at",
        ],
        ...list.map((a) => {
          const f = first(a.id);
          return [
            a.id,
            a.name,
            a.description,
            a.role,
            a.rarity,
            rarityToStars(a.rarity),
            a.scriptName ?? "",
            a.hidden,
            a.sortOrder,
            a.active,
            (unlocks.get(a.id) ?? []).length,
            f?.name ?? "",
            f ? (f.unlockedAtText ?? f.unlockedAt.slice(0, 10)) : "",
            a.updatedAt,
          ];
        }),
      ];

  const name = `achievements-${new Date().toISOString().slice(0, 10)}.${tsv ? "tsv" : "csv"}`;
  return new Response(
    tsv ? toDelimited(rows, "\t", { bom: false, eol: "\n" }) : toDelimited(rows, ","),
    {
      headers: {
        "content-type": `text/${tsv ? "tab-separated-values" : "csv"}; charset=utf-8`,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "cache-control": "no-store",
      },
    },
  );
}
