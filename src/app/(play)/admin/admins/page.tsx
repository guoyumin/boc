import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import {
  deleteUser,
  resetUserPassword,
  reviewAdminRequest,
  setUserRole,
  setUserStatus,
} from "@/actions/account";
import { getAdmin } from "@/lib/auth";
import { formatStamp } from "@/lib/dates";
import { ADMIN_ROLE_LABEL } from "@/lib/labels";
import { listUsers } from "@/lib/queries";

const ROLE_LABEL: Record<string, string> = { ...ADMIN_ROLE_LABEL, member: "玩家" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const admin = await getAdmin();
  if (!admin) redirect("/login?next=/admin/admins");
  if (admin.role !== "owner") redirect("/admin?err=" + encodeURIComponent("只有站长能管账号"));

  const users = listUsers();
  const requests = users.filter((u) => u.adminRequest && u.role === "member");
  const owners = users.filter((u) => u.role === "owner");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">账号与权限</h1>
        <Link href="/admin" className="btn btn-sm">
          返回后台
        </Link>
      </div>
      <Flash err={sp.err} ok={sp.ok} />

      <section className="card">
        <div className="card-title">👮 待审管理员申请（{requests.length}）</div>
        {requests.length === 0 ? (
          <p className="muted">没有待审申请。玩家在「我的」页面里可以提交申请。</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((u) => (
              <li key={u.id} className="rounded-lg border border-line p-2">
                <p className="text-sm font-medium">
                  {u.username}
                  {u.playerName && <span className="muted"> · {u.playerName}</span>}
                </p>
                <p className="muted">{u.adminRequest}</p>
                {u.adminRequestedAt && (
                  <p className="text-xs text-faint">{formatStamp(u.adminRequestedAt)} 提交</p>
                )}
                <div className="mt-2 flex gap-2">
                  <form action={reviewAdminRequest}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button type="submit" className="btn btn-sm btn-primary">
                      批准
                    </button>
                  </form>
                  <form action={reviewAdminRequest}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button type="submit" className="btn btn-sm btn-danger">
                      拒绝
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-title">全部账号（{users.length}）</div>
        <p className="muted mb-2">
          玩家不注册也能报名，这里只有注册过的人。删除账号不会删掉玩家档案和历史记录。
        </p>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="rounded-lg border border-line p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {u.username}
                    {u.playerName && <span className="muted"> · {u.playerName}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {ROLE_LABEL[u.role] ?? u.role}
                    {u.status !== "active" && ` · ${u.status === "pending" ? "待审批" : "已停用"}`}
                  </p>
                </div>
                {u.playerId && (
                  <Link href={`/players/${u.playerId}`} className="btn btn-sm shrink-0">
                    主页
                  </Link>
                )}
              </div>
              {u.role === "owner" ? (
                // owner 只留一个降级入口：不能降自己，也不能把最后一个 owner 降掉
                u.id !== admin.id &&
                owners.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={setUserRole}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="role" value="admin" />
                      <ConfirmSubmit
                        className="btn btn-sm btn-danger"
                        message={`把 ${u.username} 从 owner 降回管理员？他将不能再管账号和权限。`}
                      >
                        撤销 owner
                      </ConfirmSubmit>
                    </form>
                  </div>
                )
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={setUserRole}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="role" value={u.role === "admin" ? "member" : "admin"} />
                    <button type="submit" className="btn btn-sm">
                      {u.role === "admin" ? "撤销管理员" : "设为管理员"}
                    </button>
                  </form>
                  <form action={setUserRole}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="role" value="owner" />
                    <ConfirmSubmit
                      className="btn btn-sm"
                      message={`把 ${u.username} 提成 owner？他将能管所有账号和权限，包括把别人也提成 owner。`}
                    >
                      设为 owner
                    </ConfirmSubmit>
                  </form>
                  <form action={setUserStatus}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="status" value={u.status === "active" ? "disabled" : "active"} />
                    <button type="submit" className="btn btn-sm">
                      {u.status === "active" ? "停用" : "启用"}
                    </button>
                  </form>
                  <form action={resetUserPassword}>
                    <input type="hidden" name="userId" value={u.id} />
                    <ConfirmSubmit
                      className="btn btn-sm"
                      message={`给 ${u.username} 生成一个临时密码？原密码会失效。`}
                    >
                      重置密码
                    </ConfirmSubmit>
                  </form>
                  <form action={deleteUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <ConfirmSubmit
                      className="btn btn-sm btn-danger"
                      message={`删除账号 ${u.username}？玩家档案和历史记录会保留。`}
                    >
                      删除
                    </ConfirmSubmit>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
