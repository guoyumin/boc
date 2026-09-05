import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { deleteAdmin, setAdminStatus } from "@/actions/admin";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
import { ADMIN_ROLE_LABEL, ADMIN_STATUS_LABEL } from "@/lib/labels";

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const me = await getAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "owner") {
    return (
      <div className="card">
        <p className="muted">只有初始管理员能管理管理员账号。</p>
      </div>
    );
  }
  const rows = db.select().from(admins).orderBy(admins.id).all();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">管理员</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-stone-800">
                  {a.username}
                  {a.id === me.id && <span className="muted"> （你）</span>}
                </p>
                <p className="muted">
                  {ADMIN_ROLE_LABEL[a.role]} · {ADMIN_STATUS_LABEL[a.status]}
                </p>
                {a.note && <p className="muted mt-1">{a.note}</p>}
              </div>
              <span className={`badge ${a.status === "active" ? "badge-brand" : "badge-plain"}`}>
                {ADMIN_STATUS_LABEL[a.status]}
              </span>
            </div>
            {a.role !== "owner" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {a.status !== "active" && (
                  <form action={setAdminStatus}>
                    <input type="hidden" name="adminId" value={a.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit" className="btn btn-sm btn-primary">
                      {a.status === "pending" ? "批准" : "启用"}
                    </button>
                  </form>
                )}
                {a.status === "active" && (
                  <form action={setAdminStatus}>
                    <input type="hidden" name="adminId" value={a.id} />
                    <input type="hidden" name="status" value="disabled" />
                    <ConfirmSubmit message={`停用 ${a.username}？`} className="btn btn-sm btn-danger">
                      停用
                    </ConfirmSubmit>
                  </form>
                )}
                <form action={deleteAdmin}>
                  <input type="hidden" name="adminId" value={a.id} />
                  <ConfirmSubmit message={`删除账号 ${a.username}？`} className="btn btn-sm btn-danger">
                    删除
                  </ConfirmSubmit>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
