import Link from "next/link";
import { redirect } from "next/navigation";
import AchievementImport from "@/components/AchievementImport";
import Flash from "@/components/Flash";
import { getAdmin } from "@/lib/auth";
import { listAchievements } from "@/lib/queries";

export default async function ImportAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const existingNames = listAchievements(true).map((a) => a.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">批量新增成就</h1>
        <Link href="/admin/achievements" className="btn btn-sm">
          返回成就管理
        </Link>
      </div>
      <Flash err={sp.err} ok={sp.ok} />
      <AchievementImport existingNames={existingNames} />
    </div>
  );
}
