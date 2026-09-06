import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { renamePlayer, setAliases, toggleArchive } from "@/actions/players";
import { getAdmin } from "@/lib/auth";
import { parseAliases } from "@/lib/players";
import { listPlayers } from "@/lib/queries";

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getAdmin())) redirect("/admin/login");
  const rows = listPlayers();

  return (
    <div className="space-y-4">
      <h1 className="page-title">名册（{rows.length} 人）</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <p className="muted">
        接龙里名字写得不一样时，把旧写法加成别名，以后就会自动认成同一个人。
      </p>
      <ul className="space-y-2">
        {rows.map((p) => {
          const aliases = parseAliases(p.aliases);
          return (
            <li key={p.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/players/${p.id}`} className="font-medium text-ink">
                  {p.name}
                </Link>
                {p.archived === 1 && <span className="badge badge-plain">已归档</span>}
              </div>
              {aliases.length > 0 && <p className="muted mt-0.5">别名：{aliases.join("、")}</p>}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-brand-bright">编辑</summary>
                <form action={renamePlayer} className="mt-2 flex gap-2">
                  <input type="hidden" name="playerId" value={p.id} />
                  <input className="input flex-1 py-1 text-sm" name="name" defaultValue={p.name} maxLength={20} />
                  <button type="submit" className="btn btn-sm">
                    改名
                  </button>
                </form>
                <form action={setAliases} className="mt-2 flex gap-2">
                  <input type="hidden" name="playerId" value={p.id} />
                  <input
                    className="input flex-1 py-1 text-sm"
                    name="aliases"
                    defaultValue={aliases.join("、")}
                    placeholder="别名，用逗号或顿号分开"
                  />
                  <button type="submit" className="btn btn-sm">
                    存别名
                  </button>
                </form>
                <form action={toggleArchive} className="mt-2">
                  <input type="hidden" name="playerId" value={p.id} />
                  <ConfirmSubmit
                    message={p.archived === 1 ? `把 ${p.name} 恢复？` : `把 ${p.name} 归档？`}
                    className="btn btn-sm"
                  >
                    {p.archived === 1 ? "恢复" : "归档"}
                  </ConfirmSubmit>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
