/**
 * GET /admin/achievements/export → 全量 CSV
 *
 * 库是成就数据的权威，导出一份下来对账、备份、或者在 Excel 里整理都方便。
 */
import { getAdmin } from "@/lib/auth";
import { rarityToStars, toDelimited } from "@/lib/achievements-csv";
import { confirmedUnlockMap, listAchievements } from "@/lib/queries";

export async function GET(): Promise<Response> {
  if (!(await getAdmin())) return new Response("需要管理员权限", { status: 403 });

  const list = listAchievements(true);
  const unlocks = confirmedUnlockMap();
  // 首解者：confirmedUnlockMap 已经按解锁时间升序排好，「已不可考」沉底
  const first = (id: number) => (unlocks.get(id) ?? [])[0] ?? null;

  const rows: (string | number | null)[][] = [
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

  const name = `achievements-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(toDelimited(rows, ","), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "no-store",
    },
  });
}
